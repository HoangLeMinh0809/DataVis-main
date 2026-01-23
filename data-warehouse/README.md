# Data Warehouse

Data Warehouse cho dự án DataVis - Sử dụng SQLite với Star Schema.

## 🏗️ Kiến trúc

```
┌─────────────────────────────────────────────────────────────────┐
│                         DATA FLOW                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [CSV Files]  ──►  [Data Lake]  ──►  [ETL Pipeline]  ──►  [DW]  │
│   (dataset/)      (data-lake/)      (scripts/)         (SQLite) │
│                                                                  │
│                                          │                       │
│                                          ▼                       │
│                                    [REST API]                    │
│                                    (server.js)                   │
│                                          │                       │
│                                          ▼                       │
│                                    [Frontend]                    │
│                                    (D3.js)                       │
└─────────────────────────────────────────────────────────────────┘
```

## 📊 Star Schema

### Dimension Tables (Bảng chiều)
- `dim_country` - Thông tin quốc gia
- `dim_time` - Thời gian (năm, tháng, quý)
- `dim_age_group` - Nhóm tuổi
- `dim_visa_type` - Loại visa
- `dim_gender` - Giới tính

### Fact Tables (Bảng sự kiện)
- `fact_migration` - Dữ liệu di cư
- `fact_demographics` - Dữ liệu dân số
- `fact_gdp` - Dữ liệu GDP
- `fact_exports` - Dữ liệu xuất khẩu

### Aggregation Tables (Bảng tổng hợp)
- `agg_migration_yearly` - Tổng hợp di cư theo năm
- `agg_migration_by_country` - Tổng hợp di cư theo quốc gia

## 🚀 Cài đặt

```bash
cd data-warehouse
npm install
```

## 📖 Sử dụng

### 1. Khởi tạo Database

```bash
npm run init-db
```

### 2. Chạy ETL Pipeline

```bash
# ETL đầy đủ
npm run etl

# Hoặc ETL với full refresh
npm run etl:full
```

### 3. Khởi động API Server

```bash
# Production
npm start

# Development (với auto-reload)
npm run dev
```

Server sẽ chạy tại: http://localhost:3000

## 📡 API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/health` | Health check |
| GET | `/api/countries` | Danh sách quốc gia |
| GET | `/api/migration` | Dữ liệu di cư (có filter) |
| GET | `/api/migration/country/:name` | Di cư theo quốc gia |
| GET | `/api/migration/year/:year` | Di cư theo năm |
| GET | `/api/migration/summary` | Tổng hợp (pre-computed) |
| GET | `/api/demographics` | Dữ liệu dân số |
| GET | `/api/exports` | Dữ liệu xuất khẩu |
| POST | `/api/query` | Custom SQL query |
| GET | `/api/stats` | Thống kê database |
| GET | `/api/etl/logs` | Log ETL |

### Ví dụ Query

```bash
# Lấy di cư năm 2023
curl http://localhost:3000/api/migration/year/2023

# Lấy di cư từ Vietnam
curl http://localhost:3000/api/migration/country/Vietnam

# Custom query
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT * FROM vw_migration_summary WHERE year = 2023"}'
```

## 🗄️ Database Schema

### ERD Diagram

```
                    ┌──────────────────┐
                    │   dim_country    │
                    ├──────────────────┤
                    │ country_id (PK)  │
                    │ country_name     │
                    │ region           │
                    │ continent        │
                    └────────┬─────────┘
                             │
┌──────────────┐    ┌────────┴────────┐    ┌──────────────┐
│  dim_time    │    │ fact_migration  │    │dim_visa_type │
├──────────────┤    ├─────────────────┤    ├──────────────┤
│ time_id (PK) │◄───┤ migration_id    │───►│visa_type_id  │
│ year         │    │ country_id (FK) │    │ visa_name    │
│ month        │    │ time_id (FK)    │    │ visa_category│
│ quarter      │    │ visa_type_id(FK)│    └──────────────┘
└──────────────┘    │ arrival_count   │
                    │ departure_count │
                    │ net_migration   │
                    └─────────────────┘
```

## 📁 Cấu trúc thư mục

```
data-warehouse/
├── package.json
├── server.js            # API Server
├── README.md
├── database/
│   └── datavis_warehouse.db  # SQLite database
└── scripts/
    ├── init-database.js      # Khởi tạo schema
    └── etl-pipeline.js       # ETL pipeline
```

## 🔄 Quy trình ETL

1. **Extract**: Đọc CSV từ `dataset/`
2. **Transform**: 
   - Parse và clean data
   - Map vào dimension tables
   - Tính toán measures
3. **Load**: 
   - Insert vào fact tables
   - Build aggregation tables
   - Update metadata

## ⚡ Performance

- Sử dụng SQLite với indexes
- Pre-computed aggregations
- Connection pooling (readonly)
- Query caching (có thể thêm Redis)
