# Phùng Anh Thư — Marketing Portfolio

Portfolio cá nhân của **Phùng Anh Thư** — Marketing Executive chuyên về Bất động sản.

**Live site:** [https://ahnthu1209.github.io/](https://ahnthu1209.github.io/)

## Nội dung

Portfolio bám sát CV gốc với 7 phần chính:

1. **Hero** — Tên, vai trò, avatar
2. **Giới thiệu** — Về bản thân + 4 con số nổi bật (15+, 2+, 3.7/4.0, 360°)
3. **Kỹ năng** — 6 năng lực cốt lõi
4. **Học vấn** — IBD@NEU Conventry University
5. **Kinh nghiệm** — Timeline 3 vị trí (IFTV, BHS, Cheers Hostel)
6. **Marketing Planning** — Quy trình 5 bước + chi tiết triển khai (Concept, Timeline, Tài liệu bán hàng, Clip, PR, OOH, Event, Kênh khác)
7. **Dự án** — 11 dự án tiêu biểu
8. **Liên hệ**

## Tech stack

- HTML / CSS / JavaScript (vanilla)
- Tailwind-free custom CSS với biến theme coral
- Google Fonts (Fraunces + Inter)
- IntersectionObserver cho reveal animation + counter
- Lightbox cho ảnh click-to-zoom
- Google Drive iframe cho PDF & video

## Cấu trúc

```
/
├── index.html
├── README.md
├── .gitignore
├── assets/
│   ├── css/style.css
│   ├── js/main.js
│   ├── images/         (avatar, og.png)
│   └── portfolio/      (ảnh từ assets gốc - bỏ PDF/MP4)
└── projects/           (ảnh hero các dự án)
```

## Tài liệu nặng (PDF & video)

2 file PDF (281MB + 261MB) và 5 video MP4 (~400-800MB mỗi file) được **không push** lên repo. Thay vào đó, chúng được nhúng qua Google Drive iframe trực tiếp trong trang.

## Deploy

Repo này là GitHub Pages User site (`ahnthu1209/ahnthu1209.github.io`). Push trực tiếp lên nhánh `main` sẽ tự động serve tại [ahnthu1209.github.io](https://ahnthu1209.github.io/).

```bash
git add .
git commit -m "Update portfolio"
git push origin main
```
