from app.services.drift.comparator import (
    compare_security_group
)



def detect_drift(

        terraform_value,

        aws_value
):

    return compare_security_group(

        terraform_value,

        aws_value
    )