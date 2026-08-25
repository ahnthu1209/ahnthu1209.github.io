/**
 * Bilingual i18n engine for Phung Anh Thu portfolio.
 * Two languages: 'vi' (default) and 'en'.
 *
 * Usage:
 *  - HTML elements with `data-i18n="key.path"` get their textContent replaced.
 *  - HTML elements with `data-i18n-attr="attr:key.path"` get an attribute set.
 *  - HTML elements with `data-i18n-html="key.path"` get innerHTML replaced.
 *  - Toggle: click the .lang-toggle button or press the 'L' key.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'pat_lang';
  var DEFAULT_LANG = 'vi';
  var SUPPORTED = ['vi', 'en'];

  var translations = {
    vi: {
      meta: {
        title: 'Phùng Anh Thư — Marketing Executive | Real Estate Portfolio',
        description: 'Portfolio của Phùng Anh Thư — Marketing Executive với 2+ năm kinh nghiệm triển khai Marketing cho 15+ dự án bất động sản. Chuyên về IMC Planning, Concept Development và Event Coordination.',
        ogTitle: 'Phùng Anh Thư — Marketing Executive',
        ogDescription: 'Marketing Executive | Real Estate | 15+ dự án | IMC Planning',
        ogLocale: 'vi_VN'
      },
      nav: {
        home: 'Phùng Anh Thư',
        about: 'Giới thiệu',
        experience: 'Kinh nghiệm',
        planning: 'Marketing Planning',
        projects: 'Dự án',
        contact: 'Liên hệ'
      },
      hero: {
        eyebrow: 'Marketing Executive — Real Estate',
        titleAccent: 'Anh Thư',
        subtitle: '2+ năm kinh nghiệm triển khai Marketing xuyên suốt vòng đời dự án bất động sản — từ Concept, IMC Planning đến phối hợp sản xuất và đánh giá hiệu quả.',
        cta: 'Khám phá portfolio',
        badgeOpen: 'Đang mở cơ hội mới',
        badgeRole: 'IFTV · Marketing Project Leader',
        marquee: [
          'IMC Planning', 'Concept Development', 'Market Research',
          'Content Creation', 'Event Coordination', 'Full-stack Marketing',
          'Real Estate Marketing'
        ]
      },
      about: {
        eyebrow: 'Giới thiệu',
        title1: 'Đam mê Marketing',
        title2: 'từ ý tưởng đến',
        title3: ' thực thi.',
        highlight: 'Về bản thân',
        p1: 'Tôi có kinh nghiệm tham gia xuyên suốt quá trình triển khai Marketing dự án bất động sản, từ phát triển concept, xây dựng nội dung, lập kế hoạch truyền thông đến phối hợp sản xuất và làm việc với các bên liên quan.',
        p2: 'Kinh nghiệm đa nhiệm giúp tôi nắm bắt dự án nhanh, kết nối các đầu việc và bảo đảm quá trình triển khai bám sát định hướng, tiến độ và mục tiêu kinh doanh.',
        p3: 'Trong giai đoạn tiếp theo, tôi muốn phát triển từ năng lực thực thi sang',
        p3Strong: 'hoạch định và quản lý tổng thể',
        p3End: ', từng bước chủ động phụ trách dự án và chịu trách nhiệm rõ hơn về hiệu quả cuối cùng.',
        stats: {
          projects: 'Dự án bất động sản đã tham gia',
          years: 'Năm kinh nghiệm Marketing BĐS',
          gpa: 'GPA chuyên ngành Business & Marketing',
          fullstack: 'Full-stack Marketing'
        }
      },
      skills: {
        eyebrow: 'Năng lực',
        title1: 'Kỹ năng ',
        title2: 'cốt lõi.',
        desc: 'Bộ kỹ năng toàn diện cho phép tôi kết nối chiến lược với thực thi trên nhiều kênh truyền thông.',
        items: [
          { name: 'Marketing Planning', desc: 'Lập kế hoạch Marketing tổng thể, theo dõi tiến độ, ngân sách và đánh giá hiệu quả.' },
          { name: 'IMC Planning', desc: 'Xây dựng kế hoạch truyền thông tích hợp đa kênh, đồng bộ key message với mục tiêu kinh doanh.' },
          { name: 'Market Research', desc: 'Nghiên cứu thị trường, đối thủ, khách hàng mục tiêu và xu hướng truyền thông.' },
          { name: 'Concept Development', desc: 'Phát triển Big Idea, câu chuyện truyền thông, slogan, key visual và key selling point.' },
          { name: 'Content Creation', desc: 'Viết content, thiết kế hình ảnh, biên tập video phục vụ digital ads, social media và landing page.' },
          { name: 'Event Coordination', desc: 'Lead sự kiện từ proposal, checklist, kịch bản, MC script đến phối hợp nhà thầu và giám sát thực thi.' }
        ]
      },
      education: {
        eyebrow: 'Học vấn',
        title1: 'Nền tảng ',
        title2: 'học thuật.',
        degree: 'Cử nhân Quốc tế',
        major: 'Business and Marketing',
        school: 'IBD@NEU — Conventry University',
        year: '2019 — 2023',
        tags: { honor: 'Bằng Xuất Sắc', gpa: 'GPA 3.7 / 4.0', scholarship: 'Học bổng KKHT 2021' }
      },
      experience: {
        eyebrow: 'Kinh nghiệm',
        title1: 'Hành trình ',
        title2: 'làm nghề.',
        desc: 'Hơn 2 năm làm việc thực chiến tại các công ty truyền thông và chủ đầu tư bất động sản, đảm nhận vai trò từ triển khai đến điều phối dự án.',
        jobs: [
          {
            role: 'Marketing Project Leader',
            company: 'Công ty Truyền thông kỹ thuật số IFTV',
            date: '03/2026 — Hiện tại',
            bullets: [
              'Trực tiếp điều phối và triển khai các hoạt động Marketing trong toàn bộ vòng đời dự án.',
              'Nghiên cứu thị trường, phân tích đối thủ, khách hàng mục tiêu và đề xuất định hướng Concept và kế hoạch truyền thông cho từng giai đoạn.',
              'Lập kế hoạch IMC, đề xuất hạng mục triển khai, theo dõi tiến độ và phối hợp kiểm soát ngân sách marketing.',
              'Sản xuất ấn phẩm bán hàng và triển khai các kênh: website, landing page, visual dự án, OOH, livestream, social media, PR.',
              'Trực tiếp làm việc với agency, nhà cung cấp và các đơn vị liên quan để triển khai các hạng mục, đảm bảo đúng tiến độ, định hướng và hiệu quả thực thi.',
              'Theo dõi, tổng hợp và đánh giá hiệu quả các hoạt động marketing; chủ động đề xuất điều chỉnh để tối ưu hiệu quả truyền thông.'
            ]
          },
          {
            role: 'Chuyên viên Marketing',
            company: 'Công ty Cổ phần Bất động sản BHS',
            date: '07/2024 — 03/2026',
            bullets: [
              'Tổng hợp thông tin thị trường, đối thủ và khách hàng để đề xuất hướng truyền thông phù hợp cho từng dự án.',
              'Tham gia xây dựng và triển khai kế hoạch IMC; theo dõi tiến độ, ngân sách các hạng mục được giao.',
              'Phụ trách ấn phẩm bán hàng và nội dung trên website, landing page, OOH, social media, PR, livestream.',
              'Phối hợp với agency, nhà cung cấp và các bộ phận liên quan để đảm bảo tiến độ, chất lượng triển khai.',
              'Hỗ trợ bộ phận Kinh doanh chuẩn bị tài liệu và triển khai các hoạt động ra mắt, mở bán dự án.',
              'Theo dõi kết quả truyền thông, tổng hợp báo cáo và đề xuất điều chỉnh.'
            ]
          },
          {
            role: 'Social Media Marketing',
            company: 'Cheers Hostel & Tours',
            date: '08/2023 — 07/2024',
            bullets: [
              'Lập kế hoạch, triển khai chiến lược Marketing phù hợp với thị hiếu và hành vi khách hàng.',
              'Viết content, thiết kế hình ảnh, biên tập video, kết hợp với team media để tạo các sản phẩm có tính tương tác cao, đảm bảo tính nhất quán trên tất cả các nền tảng.',
              'Theo dõi hiệu suất chiến dịch, phân tích số liệu và insight người dùng để tối ưu content, tăng mức độ tương tác và chuyển đổi.',
              'Lên ý tưởng và sản xuất các ấn phẩm in ấn phục vụ hoạt động quảng bá, sự kiện và thương hiệu công ty.',
              'Cập nhật liên tục các xu hướng Social Media, phân tích đối thủ để đề xuất chiến lược phù hợp.'
            ]
          }
        ]
      },
      planning: {
        eyebrow: 'Quy trình',
        title1: 'Marketing Planning',
        title2: 'xuyên suốt dự án.',
        desc: 'Kinh nghiệm hoạch định Marketing cho danh mục bất động sản đa dạng về loại hình và phân khúc: từ thấp tầng, cao tầng, khu công nghiệp, nhà ở xã hội đến các dự án hạng sang theo tiêu chuẩn quốc tế.',
        steps: [
          { title: 'Nghiên cứu thị trường & đối thủ', desc: 'Tổng hợp dữ liệu, phân tích đối thủ, khách hàng mục tiêu và xu hướng.' },
          { title: 'Xây dựng Concept', desc: 'Big Idea · Câu chuyện · Định vị · Slogan · Key Visual · KSP.' },
          { title: 'Kế hoạch truyền thông', desc: 'Key message · Key activities · Timeline bám sát mục tiêu kinh doanh.' },
          { title: 'Triển khai', desc: 'Tài liệu bán hàng, clip, creative content, PR, OOH, event và các kênh khác.' },
          { title: 'Theo dõi & báo cáo', desc: 'Đánh giá hiệu quả, đề xuất điều chỉnh phù hợp thị trường.' }
        ],
        subsections: {
          research: { title: 'Nghiên cứu thị trường & đối thủ', note: 'Market Research' },
          concept: { title: 'Xây dựng Concept', note: 'Big Idea · Slogan · Key Visual' },
          timeline: { title: 'Timeline & Kế hoạch Marketing', note: 'IMC Plan' },
          salesDoc: {
            kicker: 'Tài liệu bán hàng',
            title: 'Ấn phẩm bán hàng',
            note: 'Brochure · Tờ gập · Bản đồ',
            desc: 'Chịu trách nhiệm từ nội dung, hình ảnh đến in ấn ra thành phẩm: tờ gập, tờ rơi, bản đồ liên kết vùng, brochure...',
            docs: [
              { title: 'Preview bản in tờ gập', desc: 'File PDF preview bản in tờ gập dự án — xem qua Google Drive.', cta: 'Mở Google Drive →' },
              { title: 'Tờ gập TP', desc: 'Bản in tờ gập dự án Tân Phú Hưng — xem qua Google Drive.', cta: 'Mở Google Drive →' }
            ]
          },
          videos: {
            kicker: 'Clip dự án',
            title: 'Video & Clip',
            note: 'Teaser · TVC · Review · Năng lực',
            desc: 'Lên kịch bản, quản lý quay chụp và sản xuất: Teaser, TVC, clip review tổng quan, clip sản phẩm, clip mô hình kinh doanh...',
            cta: 'Mở trên Drive →',
            items: [
              { title: 'Teaser Concept ECO 5' },
              { title: 'AMS — Năng lực triển khai' },
              { title: 'Review tổng quan — Sơn Phúc Andora City' },
              { title: 'TVC — Sơn Phúc Andora City' },
              { title: 'The First Lounge — ANmaison' }
            ]
          },
          pr: { kicker: 'PR', title: 'Báo chí & PR', note: 'Định hướng nội dung · Thông cáo' },
          ooh: { kicker: 'OOH', title: 'Quảng cáo ngoài trời', note: 'Billboard · Biển bảng · Phướn' },
          event: {
            kicker: 'Event',
            title: 'Sự kiện',
            note: 'Proposal · Kịch bản · MC Script · 3D',
            highlights: [
              { title: 'Sự kiện Training tại rạp chiếu phim', desc: 'Sự kiện training đầu tiên tại rạp chiếu phim với hơn 1.000 người tham dự của dự án Gold Coast Vũng Tàu.' },
              { title: 'CEO Meeting sang trọng · Fine Dining', desc: 'Sự kiện CEO Meeting sang trọng kết hợp fine dining đầu tiên của dự án ANmaison.' }
            ]
          },
          channels: { kicker: 'Kênh khác', title: 'Digital · Roadshow · Livestream · VOV', note: 'Đa kênh bổ trợ' }
        },
        conceptTabs: [
          'Andora City', 'ANmaison', 'Gold Coast Vũng Tàu', 'Parc Ville', 'The Poet Residences', 'Tân Phú Hưng'
        ]
      },
      projects: {
        eyebrow: 'Dự án tiêu biểu',
        title1: 'Những dự án ',
        title2: 'đã đồng hành.',
        items: [
          { name: 'Gold Coast Cinema Training', tag: 'Sự kiện · 1.000+ người' },
          { name: 'Gold Coast Times Square', tag: 'Activation' },
          { name: 'Gold Coast Training', tag: 'Sales Activation' },
          { name: 'Gold Coast Roadshow', tag: 'Roadshow' },
          { name: 'Gold Coast OOH', tag: 'Quảng cáo ngoài trời' },
          { name: 'Park Lane', tag: 'Concept · Visual' },
          { name: 'Ramond Urbaniz', tag: 'Dự án cao tầng' },
          { name: 'Seaview Tower', tag: 'Dự án ven biển' },
          { name: 'Hội An Legacy', tag: 'Du lịch · Văn hóa' },
          { name: 'Event Activation', tag: 'Activation' },
          { name: 'Phố Hội Activation', tag: 'Activation' }
        ]
      },
      footer: {
        ctaTitle1: 'Cùng nhau kiến tạo',
        ctaTitle2: 'những chiến dịch',
        ctaTitle3: ' ý nghĩa.',
        ctaBtn: 'Liên hệ hợp tác →',
        linksTitle: 'Liên kết',
        expertiseTitle: 'Chuyên môn',
        linkHome: 'Trang chủ',
        linkAbout: 'Giới thiệu',
        linkExperience: 'Kinh nghiệm',
        linkPlanning: 'Marketing Planning',
        linkProjects: 'Dự án',
        expertiseIMC: 'IMC Planning',
        expertiseConcept: 'Concept Development',
        expertiseEvent: 'Event Coordination',
        expertiseContent: 'Content Creation',
        expertiseResearch: 'Market Research',
        copyright: '© 2026 Phùng Anh Thư · Marketing Executive Portfolio',
        github: 'github.com/ahnthu1209'
      },
      lightbox: {
        close: 'Đóng',
        menuToggle: 'Menu'
      },
      lang: { vi: 'VI', en: 'EN', switchTo: 'EN' }
    },

    en: {
      meta: {
        title: 'Phung Anh Thu — Marketing Executive | Real Estate Portfolio',
        description: 'Portfolio of Phung Anh Thu — Marketing Executive with 2+ years driving marketing for 15+ real estate projects. Specialised in IMC Planning, Concept Development and Event Coordination.',
        ogTitle: 'Phung Anh Thu — Marketing Executive',
        ogDescription: 'Marketing Executive | Real Estate | 15+ projects | IMC Planning',
        ogLocale: 'en_US'
      },
      nav: {
        home: 'Phung Anh Thu',
        about: 'About',
        experience: 'Experience',
        planning: 'Marketing Planning',
        projects: 'Projects',
        contact: 'Contact'
      },
      hero: {
        eyebrow: 'Marketing Executive — Real Estate',
        titleAccent: 'Anh Thu',
        subtitle: '2+ years driving marketing across the full real estate project lifecycle — from concept and IMC planning to production coordination and performance review.',
        cta: 'Explore portfolio',
        badgeOpen: 'Open to new opportunities',
        badgeRole: 'IFTV · Marketing Project Leader',
        marquee: [
          'IMC Planning', 'Concept Development', 'Market Research',
          'Content Creation', 'Event Coordination', 'Full-stack Marketing',
          'Real Estate Marketing'
        ]
      },
      about: {
        eyebrow: 'About',
        title1: 'Passion for marketing',
        title2: 'from idea to',
        title3: ' execution.',
        highlight: 'About me',
        p1: 'I have hands-on experience across the full marketing lifecycle of real estate projects — from concept development and content creation to communications planning, production coordination and stakeholder management.',
        p2: 'A multi-disciplinary background helps me ramp up quickly on new projects, connect the moving parts and keep execution tightly aligned with strategy, timeline and commercial goals.',
        p3: 'Going forward, I want to grow from execution into',
        p3Strong: 'strategic planning and end-to-end ownership',
        p3End: ' — progressively leading projects and taking clearer accountability for the final outcome.',
        stats: {
          projects: 'Real estate projects delivered',
          years: 'Years in real estate marketing',
          gpa: 'GPA in Business & Marketing',
          fullstack: 'Full-stack marketing'
        }
      },
      skills: {
        eyebrow: 'Capabilities',
        title1: 'Core ',
        title2: 'skills.',
        desc: 'A well-rounded skill set that bridges strategy and execution across multiple communications channels.',
        items: [
          { name: 'Marketing Planning', desc: 'End-to-end marketing plans with timeline, budget tracking and performance evaluation.' },
          { name: 'IMC Planning', desc: 'Integrated multi-channel communications plans that align key messages with business goals.' },
          { name: 'Market Research', desc: 'Market, competitor and target-customer research, plus communications trend tracking.' },
          { name: 'Concept Development', desc: 'Big ideas, brand stories, slogans, key visuals and key selling points.' },
          { name: 'Content Creation', desc: 'Copywriting, design and video editing for digital ads, social media and landing pages.' },
          { name: 'Event Coordination', desc: 'Lead events end-to-end: proposal, checklist, run-of-show, MC script, vendor coordination and on-site supervision.' }
        ]
      },
      education: {
        eyebrow: 'Education',
        title1: 'Academic ',
        title2: 'foundation.',
        degree: 'Bachelor of International Programme',
        major: 'Business and Marketing',
        school: 'IBD@NEU — Coventry University',
        year: '2019 — 2023',
        tags: { honor: 'Distinction', gpa: 'GPA 3.7 / 4.0', scholarship: 'Merit Scholarship 2021' }
      },
      experience: {
        eyebrow: 'Experience',
        title1: 'My professional ',
        title2: 'journey.',
        desc: 'Over two years of hands-on work at media agencies and real estate developers — from execution to project coordination.',
        jobs: [
          {
            role: 'Marketing Project Leader',
            company: 'IFTV Digital Media Company',
            date: 'Mar 2026 — Present',
            bullets: [
              'Directly coordinate and drive marketing activities across the full project lifecycle.',
              'Conduct market and competitor research, analyse target customers and propose concept and communications direction for each stage.',
              'Build IMC plans, propose scope of work, track progress and help control marketing budgets.',
              'Produce sales collaterals and run multi-channel execution: website, landing pages, project visuals, OOH, livestream, social media and PR.',
              'Work directly with agencies, vendors and stakeholders to deliver scope on time, on strategy and with quality.',
              'Track, consolidate and evaluate marketing performance; proactively recommend optimisations.'
            ]
          },
          {
            role: 'Marketing Specialist',
            company: 'BHS Real Estate Joint Stock Company',
            date: 'Jul 2024 — Mar 2026',
            bullets: [
              'Synthesised market, competitor and customer data to recommend the right communications direction for each project.',
              'Co-built and executed IMC plans; tracked progress and budgets for assigned scope.',
              'Owned sales collaterals and content for website, landing pages, OOH, social media, PR and livestream.',
              'Coordinated with agencies, vendors and internal teams to ensure timely, high-quality delivery.',
              'Supported the Sales team with launch and sales-opening materials and activities.',
              'Monitored communications results, compiled reports and recommended optimisations.'
            ]
          },
          {
            role: 'Social Media Marketing',
            company: 'Cheers Hostel & Tours',
            date: 'Aug 2023 — Jul 2024',
            bullets: [
              'Built and rolled out marketing strategies aligned with audience tastes and behaviours.',
              'Wrote copy, designed visuals and edited videos together with the media team to deliver highly interactive, on-brand content across all platforms.',
              'Monitored campaign performance, analysed metrics and user insights to optimise content, engagement and conversion.',
              'Concepted and produced print collaterals for promotions, events and corporate branding.',
              'Continuously tracked social media trends and competitor activity to recommend the right strategy.'
            ]
          }
        ]
      },
      planning: {
        eyebrow: 'Process',
        title1: 'Marketing planning',
        title2: 'across the project.',
        desc: 'Marketing planning experience across a diverse real estate portfolio — from low-rise and high-rise residential, to industrial parks, social housing and internationally-standard luxury developments.',
        steps: [
          { title: 'Market & competitor research', desc: 'Data synthesis, competitor analysis, target customers and trend tracking.' },
          { title: 'Concept development', desc: 'Big idea · Story · Positioning · Slogan · Key visual · KSP.' },
          { title: 'Communications plan', desc: 'Key message · Key activities · Timeline aligned to business goals.' },
          { title: 'Execution', desc: 'Sales documents, video, creative content, PR, OOH, events and other channels.' },
          { title: 'Tracking & reporting', desc: 'Performance evaluation and recommendations to keep plans market-fit.' }
        ],
        subsections: {
          research: { title: 'Market & competitor research', note: 'Market Research' },
          concept: { title: 'Concept development', note: 'Big Idea · Slogan · Key Visual' },
          timeline: { title: 'Timeline & marketing plan', note: 'IMC Plan' },
          salesDoc: {
            kicker: 'Sales documents',
            title: 'Sales collaterals',
            note: 'Brochure · Flyer · Map',
            desc: 'End-to-end responsibility from content and visuals through to print: flyers, leaflets, regional connection maps, brochures…',
            docs: [
              { title: 'Brochure print preview', desc: 'PDF preview of the project brochure — view on Google Drive.', cta: 'Open on Google Drive →' },
              { title: 'TP Flyer', desc: 'Printed flyer for the Tan Phu Hung project — view on Google Drive.', cta: 'Open on Google Drive →' }
            ]
          },
          videos: {
            kicker: 'Project videos',
            title: 'Video & clips',
            note: 'Teaser · TVC · Review · Capabilities',
            desc: 'Scriptwriting, shoot management and production: teaser, TVC, project overview reviews, product clips, business model clips and more.',
            cta: 'Open on Drive →',
            items: [
              { title: 'Teaser — Concept ECO 5' },
              { title: 'AMS — Capabilities reel' },
              { title: 'Project overview — Son Phuc Andora City' },
              { title: 'TVC — Son Phuc Andora City' },
              { title: 'The First Lounge — ANmaison' }
            ]
          },
          pr: { kicker: 'PR', title: 'Press & PR', note: 'Editorial direction · Press releases' },
          ooh: { kicker: 'OOH', title: 'Out-of-home', note: 'Billboard · Signage · Banners' },
          event: {
            kicker: 'Event',
            title: 'Events',
            note: 'Proposal · Run-of-show · MC script · 3D',
            highlights: [
              { title: 'Cinema training event', desc: 'A first-of-its-kind training event at a cinema with 1,000+ attendees for the Gold Coast Vung Tau project.' },
              { title: 'CEO Meeting · Fine dining', desc: 'A premium CEO meeting paired with fine dining — a first for the ANmaison project.' }
            ]
          },
          channels: { kicker: 'Other channels', title: 'Digital · Roadshow · Livestream · VOV', note: 'Supporting multi-channel mix' }
        },
        conceptTabs: [
          'Andora City', 'ANmaison', 'Gold Coast Vung Tau', 'Parc Ville', 'The Poet Residences', 'Tan Phu Hung'
        ]
      },
      projects: {
        eyebrow: 'Featured projects',
        title1: 'Projects I have ',
        title2: 'partnered on.',
        items: [
          { name: 'Gold Coast Cinema Training', tag: 'Event · 1,000+ attendees' },
          { name: 'Gold Coast Times Square', tag: 'Activation' },
          { name: 'Gold Coast Training', tag: 'Sales Activation' },
          { name: 'Gold Coast Roadshow', tag: 'Roadshow' },
          { name: 'Gold Coast OOH', tag: 'Out-of-home' },
          { name: 'Park Lane', tag: 'Concept · Visual' },
          { name: 'Ramond Urbaniz', tag: 'High-rise project' },
          { name: 'Seaview Tower', tag: 'Coastal project' },
          { name: 'Hoi An Legacy', tag: 'Tourism · Culture' },
          { name: 'Event Activation', tag: 'Activation' },
          { name: 'Pho Hoi Activation', tag: 'Activation' }
        ]
      },
      footer: {
        ctaTitle1: 'Let\'s build',
        ctaTitle2: 'meaningful',
        ctaTitle3: ' campaigns together.',
        ctaBtn: 'Get in touch →',
        linksTitle: 'Links',
        expertiseTitle: 'Expertise',
        linkHome: 'Home',
        linkAbout: 'About',
        linkExperience: 'Experience',
        linkPlanning: 'Marketing Planning',
        linkProjects: 'Projects',
        expertiseIMC: 'IMC Planning',
        expertiseConcept: 'Concept Development',
        expertiseEvent: 'Event Coordination',
        expertiseContent: 'Content Creation',
        expertiseResearch: 'Market Research',
        copyright: '© 2026 Phung Anh Thu · Marketing Executive Portfolio',
        github: 'github.com/ahnthu1209'
      },
      lightbox: {
        close: 'Close',
        menuToggle: 'Menu'
      },
      lang: { vi: 'VI', en: 'EN', switchTo: 'VI' }
    }
  };

  /* ---------- state + persistence ---------- */
  function getStoredLang() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored && SUPPORTED.indexOf(stored) !== -1) return stored;
    } catch (e) { /* localStorage unavailable */ }
    return null;
  }

  function setStoredLang(lang) {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* ignore */ }
  }

  function detectLang() {
    var stored = getStoredLang();
    if (stored) return stored;
    var navLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
    if (navLang.indexOf('en') === 0) return 'en';
    return DEFAULT_LANG;
  }

  var currentLang = detectLang();

  /* ---------- helpers ---------- */
  function lookup(obj, path) {
    var parts = path.split('.');
    var cur = obj;
    for (var i = 0; i < parts.length; i++) {
      if (cur == null) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function setMeta(name, content) {
    if (!content) return;
    var attr = name.indexOf('og:') === 0 ? 'property' : 'name';
    var el = document.querySelector('meta[' + attr + '="' + name + '"]');
    if (el) el.setAttribute('content', content);
  }

  /* ---------- render ---------- */
  function applyLang(lang) {
    if (SUPPORTED.indexOf(lang) === -1) lang = DEFAULT_LANG;
    currentLang = lang;
    setStoredLang(lang);

    var dict = translations[lang];
    var fallback = translations[DEFAULT_LANG];
    var html = document.documentElement;
    html.setAttribute('lang', lang === 'vi' ? 'vi' : 'en');

    // text nodes
    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      var key = nodes[i].getAttribute('data-i18n');
      var val = lookup(dict, key);
      if (val === undefined) val = lookup(fallback, key);
      if (val !== undefined) nodes[i].textContent = val;
    }

    // html nodes (when markup is required)
    var htmlNodes = document.querySelectorAll('[data-i18n-html]');
    for (var j = 0; j < htmlNodes.length; j++) {
      var k = htmlNodes[j].getAttribute('data-i18n-html');
      var v = lookup(dict, k);
      if (v === undefined) v = lookup(fallback, k);
      if (v !== undefined) htmlNodes[j].innerHTML = v;
    }

    // attribute nodes: data-i18n-attr="attr:key"
    var attrNodes = document.querySelectorAll('[data-i18n-attr]');
    for (var a = 0; a < attrNodes.length; a++) {
      var spec = attrNodes[a].getAttribute('data-i18n-attr');
      var parts = spec.split(':');
      if (parts.length !== 2) continue;
      var attr = parts[0];
      var k2 = parts[1];
      var v2 = lookup(dict, k2);
      if (v2 === undefined) v2 = lookup(fallback, k2);
      if (v2 !== undefined) attrNodes[a].setAttribute(attr, v2);
    }

    // meta tags
    setMeta('description', lookup(dict, 'meta.description'));
    setMeta('og:title', lookup(dict, 'meta.ogTitle'));
    setMeta('og:description', lookup(dict, 'meta.ogDescription'));
    setMeta('og:locale', lookup(dict, 'meta.ogLocale'));
    document.title = lookup(dict, 'meta.title') || document.title;

    // toggle UI label
    var toggles = document.querySelectorAll('.lang-toggle');
    for (var t = 0; t < toggles.length; t++) {
      var next = lang === 'vi' ? 'en' : 'vi';
      toggles[t].setAttribute('data-lang', next);
      var labelEl = toggles[t].querySelector('.lang-toggle-label');
      if (labelEl) labelEl.textContent = (next === 'vi' ? 'VI' : 'EN');
      toggles[t].setAttribute('aria-label',
        (next === 'vi' ? 'Chuyển sang tiếng Việt' : 'Switch to English'));
    }

    // dispatch event for external listeners
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: lang } }));
  }

  function toggleLang() {
    applyLang(currentLang === 'vi' ? 'en' : 'vi');
  }

  /* ---------- bootstrap ---------- */
  function init() {
    // wire up toggles
    var toggles = document.querySelectorAll('.lang-toggle');
    for (var i = 0; i < toggles.length; i++) {
      toggles[i].addEventListener('click', function (e) {
        e.preventDefault();
        toggleLang();
      });
    }

    // keyboard shortcut: press L to toggle (ignore when typing in inputs)
    document.addEventListener('keydown', function (e) {
      var tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'l' || e.key === 'L') {
        toggleLang();
      }
    });

    applyLang(currentLang);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // expose for debugging / external use
  window.PAT_I18N = {
    set: applyLang,
    toggle: toggleLang,
    get: function () { return currentLang; },
    SUPPORTED: SUPPORTED
  };

  // expose the dictionary so dynamic renderers can read it
  window.PAT_I18N_DICT = translations;
})();
