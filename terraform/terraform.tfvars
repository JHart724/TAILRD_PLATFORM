environment    = "production"
aws_region     = "us-east-1"
aws_account_id = "863518424332"
project_name   = "tailrd"
domain_name    = "tailrd-heart.com"

# Existing CloudFormation VPC resources
vpc_id = "vpc-0fc14ae0c2511b94d"

public_subnet_ids = [
  "subnet-05005c1062487e51d", # tailrd-production-public-1a (10.0.1.0/24)
  "subnet-0794c54e42aaa900c", # tailrd-production-public-1b (10.0.2.0/24)
]

private_subnet_ids = [
  "subnet-0071588b7174f200a", # tailrd-production-private-1a (10.0.10.0/24)
  "subnet-0e606d5eea0f4c89b", # tailrd-production-private-1b (10.0.11.0/24)
]

database_subnet_ids = [
  "subnet-0168950e9541ff9f6", # tailrd-production-database-1a (10.0.20.0/24)
  "subnet-02c70b0a102cf8d3c", # tailrd-production-database-1b (10.0.21.0/24)
]

# Existing CloudFormation security groups
alb_security_group_id = "sg-006bd9717fb020f7f" # ALBSecurityGroup
app_security_group_id = "sg-07cf4b72927f9038f" # AppSecurityGroup
db_security_group_id  = "sg-09e3b87c3cbc42925" # DatabaseSecurityGroup

# Existing CloudFormation KMS keys
phi_kms_key_arn = "arn:aws:kms:us-east-1:863518424332:key/46f6551f-84e6-434f-9316-05055317a1e7"
s3_kms_key_arn  = "arn:aws:kms:us-east-1:863518424332:key/99ed0be7-e3e3-4b43-9e24-3c11a3614db0"

# Synthea data bucket
synthea_bucket = "tailrd-cardiovascular-datasets-863518424332"

# RDS sizing
db_instance_class   = "db.t3.medium"
db_allocated_storage = 100

# ECS sizing
ecs_cpu           = 1024  # 1 vCPU
ecs_memory        = 2048  # 2 GB
ecs_desired_count = 2     # 2 tasks for HA
container_port    = 3001
