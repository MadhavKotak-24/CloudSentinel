import boto3


def scan_iam():

    findings=[]

    iam=boto3.client("iam")

    users=iam.list_users()


    for user in users["Users"]:

        policies=iam.list_attached_user_policies(

            UserName=user["UserName"]
        )


        for policy in policies[

            "AttachedPolicies"

        ]:

            if policy["PolicyName"]=="AdministratorAccess":

                findings.append({

                    "severity":"CRITICAL",

                    "resource":user["UserName"],

                    "description":"Administrator access assigned",

                    "remediation":"Apply least privilege"
                })

    return findings