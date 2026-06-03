resource "aws_s3_bucket" "unsecure_bucket" {
  bucket = "cloudsentinel-unsecure-data-vault"
  acl    = "public-read" # Overly permissive
}

resource "aws_ebs_volume" "unencrypted_volume" {
  availability_zone = "us-east-1a"
  size              = 40
  # missing encryption configuration
}
