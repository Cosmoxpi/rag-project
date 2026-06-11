"""
rag/s3_sync.py
──────────────
Utility to push/pull the ChromaDB directory to/from S3.
Call sync_from_s3() on startup and sync_to_s3() after ingestion.

Usage (from a management script or a startup hook):

    from rag.s3_sync import sync_from_s3, sync_to_s3
    sync_from_s3()   # pull latest index before the app starts
    ...
    sync_to_s3()     # push after a new PDF is ingested
"""

import logging
import os
from pathlib import Path

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)

S3_BUCKET       = os.environ["S3_BUCKET"]           # e.g. "my-rag-chroma-index"
S3_PREFIX       = os.getenv("S3_PREFIX", "chroma/") # key prefix inside the bucket
CHROMA_DIR      = Path(os.getenv("CHROMA_PERSIST_DIR", "./chroma_db"))
AWS_REGION      = os.getenv("AWS_REGION", "us-east-1")


def _s3_client():
    return boto3.client("s3", region_name=AWS_REGION)


def sync_from_s3() -> int:
    """
    Download all objects under S3_PREFIX to CHROMA_DIR.
    Returns the number of files downloaded.
    """
    s3     = _s3_client()
    CHROMA_DIR.mkdir(parents=True, exist_ok=True)
    paginator = s3.get_paginator("list_objects_v2")
    count     = 0

    for page in paginator.paginate(Bucket=S3_BUCKET, Prefix=S3_PREFIX):
        for obj in page.get("Contents", []):
            key       = obj["Key"]
            rel_path  = key[len(S3_PREFIX):]          # strip prefix
            if not rel_path:
                continue
            local_path = CHROMA_DIR / rel_path
            local_path.parent.mkdir(parents=True, exist_ok=True)
            logger.info("Downloading s3://%s/%s → %s", S3_BUCKET, key, local_path)
            s3.download_file(S3_BUCKET, key, str(local_path))
            count += 1

    logger.info("sync_from_s3 complete: %d files downloaded.", count)
    return count


def sync_to_s3() -> int:
    """
    Upload all files in CHROMA_DIR to S3 under S3_PREFIX.
    Returns the number of files uploaded.
    """
    s3    = _s3_client()
    count = 0

    for local_path in CHROMA_DIR.rglob("*"):
        if local_path.is_dir():
            continue
        rel_path = local_path.relative_to(CHROMA_DIR)
        key      = S3_PREFIX + str(rel_path)
        logger.info("Uploading %s → s3://%s/%s", local_path, S3_BUCKET, key)
        s3.upload_file(str(local_path), S3_BUCKET, key)
        count += 1

    logger.info("sync_to_s3 complete: %d files uploaded.", count)
    return count


def ensure_bucket_exists():
    """Create the S3 bucket if it doesn't already exist (idempotent)."""
    s3 = _s3_client()
    try:
        s3.head_bucket(Bucket=S3_BUCKET)
        logger.info("S3 bucket '%s' already exists.", S3_BUCKET)
    except ClientError as e:
        if e.response["Error"]["Code"] == "404":
            logger.info("Creating S3 bucket '%s'...", S3_BUCKET)
            kwargs = {"Bucket": S3_BUCKET}
            if AWS_REGION != "us-east-1":
                kwargs["CreateBucketConfiguration"] = {
                    "LocationConstraint": AWS_REGION
                }
            s3.create_bucket(**kwargs)
            # Block all public access
            s3.put_public_access_block(
                Bucket=S3_BUCKET,
                PublicAccessBlockConfiguration={
                    "BlockPublicAcls": True,
                    "IgnorePublicAcls": True,
                    "BlockPublicPolicy": True,
                    "RestrictPublicBuckets": True,
                },
            )
        else:
            raise
