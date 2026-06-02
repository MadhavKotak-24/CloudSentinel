import boto3


def scan_security_groups():

    findings=[]

    ec2=boto3.client("ec2")

    groups=ec2.describe_security_groups()


    for group in groups["SecurityGroups"]:

        for permission in group["IpPermissions"]:

            for ip in permission.get(

                "IpRanges",

                []

            ):

                if ip["CidrIp"]=="0.0.0.0/0":

                    findings.append({

                        "severity":"HIGH",

                        "resource":group["GroupName"],

                        "description":"Public ingress",

                        "remediation":"Restrict CIDR"
                    })

    return findings