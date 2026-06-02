import re


def scan_secrets(content):

    findings=[]


    pattern=r"AWS_ACCESS_KEY_ID"


    if re.search(
        pattern,
        content
    ):

        findings.append({

            "severity":"CRITICAL",

            "resource":"Secrets",

            "description":"AWS credentials found",

            "remediation":"Move secrets to Vault"
        })

    return findings