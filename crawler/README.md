# DataVis Crawler

Hệ thống tự động cào dữ liệu hàng tháng cho dự án DataVis.

## 📋 Tính năng

- ✅ Tự động crawl dữ liệu theo lịch (mặc định: ngày 1 hàng tháng)
- ✅ Hỗ trợ nhiều định dạng: CSV, JSON
- ✅ Tự động backup file cũ trước khi ghi đè
- ✅ Retry mechanism khi request lỗi
- ✅ Logging đầy đủ với file log theo ngày
- ✅ Hỗ trợ thông báo qua webhook (Slack, Discord...)
- ✅ Dễ dàng mở rộng với custom transformer

## 🚀 Cài đặt

```bash
cd crawler
npm install
```

## ⚙️ Cấu hình

### 1. Cấu hình nguồn dữ liệu

Mở file `config.js` và điền URL API cho từng nguồn:

```javascript
dataSources: {
    ageandsex: {
        enabled: true,
        url: 'https://api.example.com/age-sex-data', // Điền URL thực
        outputFile: 'ageandsex.csv',
        format: 'csv',
        // ...
    },
    // ...
}
```

### 2. Tùy chỉnh lịch crawl

Mặc định crawl vào 00:00 ngày 1 hàng tháng. Thay đổi trong `config.js`:

```javascript
// Cron format: second minute hour dayOfMonth month dayOfWeek
cronSchedule: '0 0 0 1 * *',  // Ngày 1 hàng tháng
// cronSchedule: '0 0 0 * * 0',  // Hàng tuần (Chủ nhật)
// cronSchedule: '0 0 0 * * *',  // Hàng ngày
```

### 3. Tùy chỉnh transformer

Mở file `utils/dataTransformer.js` để tùy chỉnh cách xử lý dữ liệu từ API:

```javascript
transformAgeandsex(data, source) {
    // Tùy chỉnh theo cấu trúc API thực tế
    return data.results.map(item => ({
        age_group: item.age_group,
        male: item.male,
        female: item.female,
        total: item.total
    }));
}
```

## 📖 Sử dụng

### Chạy scheduler (chạy liên tục)

```bash
npm start
```

### Crawl ngay lập tức (manual)

```bash
# Crawl tất cả sources
npm run crawl-now

# Crawl sources cụ thể
node crawl-now.js gdp nzData
```

### Test transformers

```bash
npm test
```

## 📁 Cấu trúc thư mục

```
crawler/
├── index.js              # Entry point - scheduler
├── crawl-now.js          # Manual crawl script
├── test-crawler.js       # Test script
├── config.js             # Cấu hình chính
├── package.json
├── .env.example          # Template biến môi trường
├── .gitignore
├── README.md
├── services/
│   └── crawlerService.js # Service xử lý crawl
├── utils/
│   ├── logger.js         # Logging utility
│   └── dataTransformer.js # Data transformation
├── logs/                 # Log files (auto-created)
└── backups/              # Backup files (auto-created)
```

## 🔧 Các nguồn dữ liệu

| Tên | File output | Mô tả | URL Status |
|-----|------------|-------|------------|
| ageandsex | ageandsex.csv | Dữ liệu tuổi và giới tính | ⏳ Chưa cấu hình |
| gdp | gdp-penn-world-table.csv | Dữ liệu GDP | ⏳ Chưa cấu hình |
| nzData | nz_data.csv | Dữ liệu NZ tổng hợp | ⏳ Chưa cấu hình |
| nzMigration | NZ_MIGRATION.csv | Dữ liệu di cư NZ | ⏳ Chưa cấu hình |
| nzRadar | nz_radio.csv | Dữ liệu radar chart | ⏳ Chưa cấu hình |
| treemap | data_treemap.csv | Dữ liệu treemap | ⏳ Chưa cấu hình |
| worldMap | world.json | GeoJSON bản đồ thế giới | ⏳ Chưa cấu hình |
| worldMap2 | world2.json | GeoJSON v2 | ⏳ Chưa cấu hình |

## 🐛 Troubleshooting

### Lỗi kết nối API
- Kiểm tra URL đã đúng chưa
- Kiểm tra API key (nếu cần)
- Tăng `timeout` trong config

### Dữ liệu bị sai format
- Kiểm tra và tùy chỉnh transformer tương ứng trong `dataTransformer.js`
- Thêm console.log để debug cấu trúc response

### Log file quá lớn
- Log files được tạo theo ngày
- Có thể xóa thủ công các file cũ trong thư mục `logs/`

## 📝 TODO

- [ ] Điền URL API cho tất cả sources
- [ ] Tùy chỉnh transformers theo API thực tế
- [ ] Cấu hình thông báo email/webhook
- [ ] Setup chạy như service (PM2, systemd...)

## 🤝 Contributing

1. Fork repo
2. Tạo branch feature
3. Commit changes
4. Push và tạo PR
