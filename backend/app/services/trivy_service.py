import subprocess
import json



def run_trivy(image_name):
    try:
        command=[
            "trivy",
            "image",
            image_name,
            "--format",
            "json"
        ]
        result=subprocess.run(
            command,
            capture_output=True,
            text=True,
            check=True
        )
        return json.loads(result.stdout)
    except Exception as e:
        return {"Results": [{"Target": image_name, "Vulnerabilities": []}], "error": str(e)}