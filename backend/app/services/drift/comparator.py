def compare_security_group(

        expected,

        actual

):

    drifts=[]


    if expected != actual:

        drifts.append({

            "resource":"Security Group",

            "expected":expected,

            "actual":actual,

            "severity":"HIGH"
        })


    return drifts