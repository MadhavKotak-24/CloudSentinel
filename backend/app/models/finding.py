from app.config.extensions import db


class Finding(db.Model):

    __tablename__="findings"

    id=db.Column(
        db.Integer,
        primary_key=True
    )

    scan_id=db.Column(
        db.Integer,
        db.ForeignKey('scans.id'),
        nullable=False
    )

    severity=db.Column(
        db.String(50)
    )

    resource=db.Column(
        db.String(100)
    )

    description=db.Column(
        db.Text
    )

    remediation=db.Column(
        db.Text
    )

    risk_score=db.Column(
        db.Integer
    )

    scan_id=db.Column(

        db.Integer,

        db.ForeignKey("scans.id")
    )