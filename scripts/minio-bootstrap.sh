#!/bin/sh
# Create the bucket and a scoped app user (not root) with access to just it.
# Idempotent: safe to re-run. Runs once at stack start via the minio-init service.
set -eu

mc alias set local http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"

# Bucket
mc mb --ignore-existing "local/$S3_BUCKET"

# Scoped policy limited to this bucket
cat > /tmp/crm-policy.json <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    { "Effect": "Allow",
      "Action": ["s3:GetObject","s3:PutObject","s3:DeleteObject","s3:ListBucket"],
      "Resource": ["arn:aws:s3:::$S3_BUCKET","arn:aws:s3:::$S3_BUCKET/*"] }
  ]
}
JSON
mc admin policy create local crm-app-policy /tmp/crm-policy.json 2>/dev/null || true

# App user + attach policy (ignore "already exists")
mc admin user add local "$S3_ACCESS_KEY_ID" "$S3_SECRET_ACCESS_KEY" 2>/dev/null || true
mc admin policy attach local crm-app-policy --user "$S3_ACCESS_KEY_ID" 2>/dev/null || true

echo "MinIO bootstrap complete: bucket '$S3_BUCKET', user '$S3_ACCESS_KEY_ID'."
