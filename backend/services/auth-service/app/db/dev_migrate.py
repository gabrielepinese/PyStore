from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

# Dev/demo convenience only — a real deployment manages schema changes via
# Alembic migrations. `Base.metadata.create_all()` creates missing *tables*
# but never adds columns to a table that already exists, so a column added
# to a model after the dev DB file was first created needs this instead.
_TABLE_COLUMN_ADDITIONS: dict[str, dict[str, str]] = {
    "users": {
        "last_name": "VARCHAR(255)",
        "country": "VARCHAR(100)",
        "city": "VARCHAR(100)",
    },
}


def add_missing_columns(engine: Engine) -> None:
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    with engine.begin() as conn:
        for table, columns in _TABLE_COLUMN_ADDITIONS.items():
            if table not in existing_tables:
                continue  # create_all() will make it with every column already
            existing_columns = {col["name"] for col in inspector.get_columns(table)}
            for column, ddl_type in columns.items():
                if column not in existing_columns:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl_type}"))
