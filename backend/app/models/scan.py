from app.config.extensions import db


class Scan(db.Model):

    __tablename__="scans"

    id=db.Column(
        db.Integer,
        primary_key=True
    )

    user_id=db.Column(
        db.Integer,
        db.ForeignKey('user.id'),
        nullable=False
    )

    scan_type=db.Column(
        db.String(100),
        nullable=False
    )

    status=db.Column(
        db.String(50),
        default="Pending"
    )

    timestamp=db.Column(
        db.DateTime,
        server_default=db.func.now()
    )

    findings=db.relationship(

        "Finding",

        backref="scan",

        lazy=True
    )