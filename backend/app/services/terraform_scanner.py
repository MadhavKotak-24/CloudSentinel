def scan_terraform(content):

    findings=[]


    if "0.0.0.0/0" in content:

        findings.append({

            "severity":"HIGH",

            "resource":"Security Group",

            "description":"Public access detected",

            "remediation":"Restrict CIDR range"

        })


    return findings