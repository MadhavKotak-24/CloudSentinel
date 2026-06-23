def run_kubernetes_scan():
    findings = []
    
    try:
        from kubernetes import client, config
    except ImportError as e:
        raise RuntimeError("Kubernetes Python SDK is not installed. Run 'pip install kubernetes' to enable live scans.") from e

    try:
        try:
            config.load_kube_config()
        except Exception:
            config.load_incluster_config()
            
        v1 = client.CoreV1Api()
        
        # Scan pods across all namespaces
        ret = v1.list_pod_for_all_namespaces(watch=False)
        for pod in ret.items:
            pod_name = pod.metadata.name
            namespace = pod.metadata.namespace
            
            # Check container specifications
            if pod.spec and pod.spec.containers:
                for container in pod.spec.containers:
                    c_name = container.name
                    res_path = f"k8s://namespaces/{namespace}/pods/{pod_name}/containers/{c_name}"
                    
                    sc = container.security_context
                    if sc:
                        if getattr(sc, 'privileged', False):
                            findings.append({
                                "severity": "CRITICAL",
                                "resource": res_path,
                                "description": f"Container '{c_name}' in pod '{pod_name}' is running in privileged mode, granting excessive host permissions.",
                                "remediation": "Disable securityContext.privileged in your deployment manifest."
                            })
                        
                        if getattr(sc, 'run_as_non_root', None) is False:
                            findings.append({
                                "severity": "HIGH",
                                "resource": res_path,
                                "description": f"Container '{c_name}' in pod '{pod_name}' is configured to run as root.",
                                "remediation": "Configure securityContext.runAsNonRoot to true and specify runAsUser/runAsGroup."
                            })
                    else:
                        findings.append({
                            "severity": "MEDIUM",
                            "resource": res_path,
                            "description": f"Container '{c_name}' in pod '{pod_name}' lacks a securityContext definition.",
                            "remediation": "Define securityContext with runAsNonRoot: true to restrict root capabilities."
                        })
                        
                    # Check CPU/Memory limits
                    limits = container.resources.limits if container.resources else None
                    if not limits or not ('cpu' in limits or 'memory' in limits):
                        findings.append({
                            "severity": "LOW",
                            "resource": res_path,
                            "description": f"Container '{c_name}' in pod '{pod_name}' does not enforce CPU or Memory limits, posing starvation risks.",
                            "remediation": "Define resource limits (resources.limits.cpu and resources.limits.memory) in the container specification."
                        })
            
            # Namespace best practices
            if namespace == "default":
                findings.append({
                    "severity": "LOW",
                    "resource": f"k8s://namespaces/{namespace}/pods/{pod_name}",
                    "description": f"Pod '{pod_name}' is running in the 'default' namespace.",
                    "remediation": "Migrate your application deployment workloads to isolated namespaces (e.g. staging, prod)."
                })
                
    except Exception as e:
        raise RuntimeError(f"Kubernetes cluster connection failed: {str(e)}") from e
        
    return findings
