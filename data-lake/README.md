# Data Lake Structure

Thư mục này chứa dữ liệu thô (raw data) được tổ chức theo chuẩn Data Lake.

## Cấu trúc

```
data-lake/
├── raw/                    # Dữ liệu thô từ sources
│   ├── migration/          # Dữ liệu di cư
│   ├── demographics/       # Dữ liệu dân số
│   ├── economic/           # Dữ liệu kinh tế
│   └── geographic/         # Dữ liệu địa lý
│
├── processed/              # Dữ liệu đã được clean
│   ├── migration/
│   ├── demographics/
│   ├── economic/
│   └── geographic/
│
└── curated/                # Dữ liệu sẵn sàng cho analytics
    └── ...
```

## Quy tắc đặt tên file

Format: `{source}_{dataset}_{YYYYMMDD}.{format}`

Ví dụ: `statsnz_migration_20260123.csv`
