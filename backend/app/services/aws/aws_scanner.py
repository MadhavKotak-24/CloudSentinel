from app.services.aws.s3_scanner import scan_s3

from app.services.aws.sg_scanner import scan_security_groups

from app.services.aws.iam_scanner import scan_iam



def run_aws_scan():

    findings=[]

    findings.extend(
        scan_s3()
    )

    findings.extend(
        scan_security_groups()
    )

    findings.extend(
        scan_iam()
    )

    return findings