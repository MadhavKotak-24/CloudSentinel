from app.config.extensions import db


class DriftEvent(db.Model):

    __tablename__="drift_events"

    id=db.Column(
        db.Integer,
        primary_key=True
    )

    resource=db.Column(
        db.String(200)
    )

    expected_value=db.Column(
        db.Text
    )

    actual_value=db.Column(
        db.Text
    )

    severity=db.Column(
        db.String(50)
    )

    timestamp=db.Column(
        db.DateTime,
        server_default=db.func.now()
    )