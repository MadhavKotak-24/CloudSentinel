def success_response(
        data=None,
        message="Success"
):

    return {

        "success":True,

        "message":message,

        "data":data
    }


def error_response(
        message
):

    return {

        "success":False,

        "message":message
    }