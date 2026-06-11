# AWS EC2 Deployment Guide — RAG Q&A API

## Architecture

```
Internet ──► EC2 t2.micro :8000 ──► Docker container
                                         │
                                    ChromaDB (local)
                                         │
                                    S3 Bucket (persistent index)
                                         │
                                    OpenAI API (embeddings + chat)
```

---

## 1. Prerequisites

| What | Why |
|------|-----|
| AWS account with IAM user | EC2 + S3 access |
| OpenAI API key | Embeddings + GPT-4o-mini |
| Docker Hub account (optional) | Hosting your image |
| Local Docker + AWS CLI installed | Build & deploy |

---

## 2. Create an S3 Bucket

```bash
# Replace with your own globally-unique name
export S3_BUCKET="my-rag-chroma-$(date +%s)"
export AWS_REGION="us-east-1"

aws s3api create-bucket --bucket "$S3_BUCKET" --region "$AWS_REGION"

# Block all public access
aws s3api put-public-access-block \
  --bucket "$S3_BUCKET" \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,\
    BlockPublicPolicy=true,RestrictPublicBuckets=true

echo "Bucket: $S3_BUCKET"
```

---

## 3. Create an IAM Role for EC2

This lets your EC2 instance access S3 without hard-coded credentials.

```bash
# Create the role
aws iam create-role \
  --role-name rag-ec2-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ec2.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

# Attach S3 full access (scope this down in production)
aws iam attach-role-policy \
  --role-name rag-ec2-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

# Create instance profile
aws iam create-instance-profile --instance-profile-name rag-ec2-profile
aws iam add-role-to-instance-profile \
  --instance-profile-name rag-ec2-profile \
  --role-name rag-ec2-role
```

---

## 4. Launch EC2 t2.micro

### 4a. Create a key pair

```bash
aws ec2 create-key-pair \
  --key-name rag-key \
  --query "KeyMaterial" \
  --output text > ~/.ssh/rag-key.pem
chmod 400 ~/.ssh/rag-key.pem
```

### 4b. Create a Security Group

```bash
export SG_ID=$(aws ec2 create-security-group \
  --group-name rag-sg \
  --description "RAG API security group" \
  --query "GroupId" --output text)

# SSH (restrict to your IP in production)
aws ec2 authorize-security-group-ingress --group-id $SG_ID \
  --protocol tcp --port 22 --cidr 0.0.0.0/0

# App port
aws ec2 authorize-security-group-ingress --group-id $SG_ID \
  --protocol tcp --port 8000 --cidr 0.0.0.0/0

echo "Security Group: $SG_ID"
```

### 4c. Launch the Instance

```bash
# Amazon Linux 2023 AMI (us-east-1) — verify latest AMI for your region
export AMI_ID="ami-0c02fb55956c7d316"

export INSTANCE_ID=$(aws ec2 run-instances \
  --image-id "$AMI_ID" \
  --instance-type t2.micro \
  --key-name rag-key \
  --security-group-ids "$SG_ID" \
  --iam-instance-profile Name=rag-ec2-profile \
  --block-device-mappings '[{"DeviceName":"/dev/xvda","Ebs":{"VolumeSize":20}}]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=rag-api}]' \
  --query "Instances[0].InstanceId" \
  --output text)

echo "Instance ID: $INSTANCE_ID"

# Wait until running
aws ec2 wait instance-running --instance-ids "$INSTANCE_ID"

export PUBLIC_IP=$(aws ec2 describe-instances \
  --instance-ids "$INSTANCE_ID" \
  --query "Reservations[0].Instances[0].PublicIpAddress" \
  --output text)

echo "Public IP: $PUBLIC_IP"
```

---

## 5. Install Docker on the EC2 Instance

```bash
ssh -i ~/.ssh/rag-key.pem ec2-user@$PUBLIC_IP

# ── On the EC2 instance ───────────────────────────────────────────────────────
sudo yum update -y
sudo yum install -y docker git
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user
newgrp docker     # reload group membership without logout
```

---

## 6. Deploy the Application

### Option A — Build on EC2 (simple, slower)

```bash
# Still on EC2
git clone https://github.com/YOUR_ORG/rag-app.git
cd rag-app

# Create the env file (never commit this)
cat > .env << EOF
OPENAI_API_KEY=sk-...
S3_BUCKET=my-rag-chroma-XXXXX
AWS_REGION=us-east-1
CHROMA_PERSIST_DIR=/app/chroma_db
EOF

docker build -t rag-api .
docker run -d \
  --name rag-api \
  --restart unless-stopped \
  -p 8000:8000 \
  --env-file .env \
  -v /home/ec2-user/chroma_db:/app/chroma_db \
  rag-api
```

### Option B — Build locally, push to ECR (recommended)

```bash
# ── On your LOCAL machine ─────────────────────────────────────────────────────
export ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export ECR_REPO="$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/rag-api"

aws ecr create-repository --repository-name rag-api --region $AWS_REGION

aws ecr get-login-password --region $AWS_REGION \
  | docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

docker build -t rag-api .
docker tag rag-api:latest "$ECR_REPO:latest"
docker push "$ECR_REPO:latest"

# ── On EC2 ────────────────────────────────────────────────────────────────────
aws ecr get-login-password --region $AWS_REGION \
  | docker login --username AWS --password-stdin \
    "$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

docker pull "$ECR_REPO:latest"
docker run -d \
  --name rag-api \
  --restart unless-stopped \
  -p 8000:8000 \
  -e OPENAI_API_KEY="sk-..." \
  -e S3_BUCKET="my-rag-chroma-XXXXX" \
  -e AWS_REGION="us-east-1" \
  -v /home/ec2-user/chroma_db:/app/chroma_db \
  "$ECR_REPO:latest"
```

---

## 7. Persist ChromaDB Index to S3

Add these calls around ingestion in `main.py` (or run manually):

```python
# In main.py upload endpoint, after ingest_pdf():
from rag.s3_sync import sync_to_s3
sync_to_s3()   # push new index to S3

# In lifespan startup, before get_vectorstore():
from rag.s3_sync import sync_from_s3
sync_from_s3() # pull latest index from S3
```

Or sync manually from EC2:

```bash
# Pull latest index from S3 to local disk
aws s3 sync s3://$S3_BUCKET/chroma/ /home/ec2-user/chroma_db/

# Push local index to S3
aws s3 sync /home/ec2-user/chroma_db/ s3://$S3_BUCKET/chroma/
```

---

## 8. Verify the Deployment

```bash
# Health check
curl http://$PUBLIC_IP:8000/health

# Upload a PDF
curl -X POST http://$PUBLIC_IP:8000/upload \
  -F "file=@/path/to/your/document.pdf"

# Query
curl -X POST http://$PUBLIC_IP:8000/query \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the main topic of the document?", "top_k": 5}'
```

---

## 9. (Optional) Systemd Auto-restart for Docker

```bash
# On EC2
sudo tee /etc/systemd/system/rag-api.service > /dev/null << 'EOF'
[Unit]
Description=RAG API Docker container
After=docker.service
Requires=docker.service

[Service]
Restart=always
ExecStart=/usr/bin/docker start -a rag-api
ExecStop=/usr/bin/docker stop rag-api

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable --now rag-api
```

---

## 10. Cost Estimate (us-east-1)

| Resource | Cost |
|----------|------|
| t2.micro (On-Demand) | ~$8.50/mo |
| 20 GB EBS gp2 | ~$2.00/mo |
| S3 (first 1 GB) | ~$0.02/mo |
| OpenAI embeddings (text-embedding-3-small) | ~$0.02 / 1M tokens |
| OpenAI GPT-4o-mini | ~$0.15 / 1M input tokens |
| **Total (light usage)** | **~$11/mo + API calls** |

> **Tip:** Use a Reserved Instance (1-year, no upfront) to cut EC2 cost to ~$5.50/mo.

---

## 11. Production Hardening Checklist

- [ ] Restrict SSH inbound to your office IP only
- [ ] Add an Application Load Balancer + ACM certificate (HTTPS)
- [ ] Store `OPENAI_API_KEY` in AWS Secrets Manager, not in `.env`
- [ ] Enable S3 versioning for index rollback
- [ ] Add request authentication (API key header or Cognito JWT)
- [ ] Set up CloudWatch log group: `docker logs` → CloudWatch agent
- [ ] Enable EC2 Instance Connect or SSM Session Manager (no open SSH port)
