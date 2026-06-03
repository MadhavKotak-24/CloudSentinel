import subprocess
import json



def run_checkov(path):
    try:
        cmd=[
            "checkov",
            "-f",
            path,
            "--output",
            "json",
            "--skip-download"
        ]
        result=subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True
        )
        return json.loads(result.stdout)
    except Exception as e:
        return {"summary": {"total": 0, "passed": 0, "failed": 0}, "results": {"passed_checks": [], "failed_checks": []}, "error": str(e)}