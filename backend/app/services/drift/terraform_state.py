import json


def load_terraform_state(path):

    with open(path,"r") as file:

        return json.load(file)