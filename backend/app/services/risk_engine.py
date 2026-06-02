def calculate_risk(severity):


    scores={

        "LOW":20,

        "MEDIUM":50,

        "HIGH":80,

        "CRITICAL":100
    }


    return scores.get(
        severity,
        10
    )