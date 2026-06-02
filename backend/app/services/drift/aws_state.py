import boto3


def get_security_group_state():

    ec2=boto3.client("ec2")

    groups=ec2.describe_security_groups()

    return groups["SecurityGroups"]