import os

from flask import Blueprint
from flask import request
from flask import jsonify


upload=Blueprint(
    "upload",
    __name__
)


UPLOAD_FOLDER="uploads"


@upload.route(
    "/terraform",
    methods=["POST"]
)

def upload_terraform():

    file=request.files["file"]

    filepath=os.path.join(

        UPLOAD_FOLDER,

        file.filename
    )

    file.save(filepath)

    return jsonify({

        "file":file.filename,

        "status":"uploaded"
    })