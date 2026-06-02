import boto3


def scan_s3():

    findings=[]

    s3=boto3.client("s3")

    buckets=s3.list_buckets()


    for bucket in buckets["Buckets"]:

        bucket_name=bucket["Name"]

        try:

            status=s3.get_bucket_policy_status(
                Bucket=bucket_name
            )

            if status["PolicyStatus"]["IsPublic"]:

                findings.append({

                    "severity":"HIGH",

                    "resource":bucket_name,

                    "description":"Public S3 bucket",

                    "remediation":"Restrict public access"
                })

        except Exception:

            pass

    return findings