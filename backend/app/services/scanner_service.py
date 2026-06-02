from app.services.secret_scanner import scan_secrets

from app.services.terraform_scanner import scan_terraform

from app.services.risk_engine import calculate_risk



def run_scan(content):

    findings=[]


    findings.extend(

        scan_terraform(content)
    )

    findings.extend(

        scan_secrets(content)
    )


    for finding in findings:

        finding["risk_score"]=calculate_risk(

            finding["severity"]
        )


    return findings