import type { ResumeEntry } from "./resume";

// 公司英文名称来源：嘉德官方图录 https://cguardian.com.hk/upload/category/GQaqPfjn_cpc2308-02.pdf
// 作业帮参赛企业页 https://ifdesign.com/en/brands-creatives/company/zuoyebang-education-technology-beijing-limited/157010
// 优锘官方文档 https://cdn.thingjs.com/doc/ThingJS%20%E5%B9%B3%E5%8F%B0%E4%B8%89%E7%BB%B4%E6%A8%A1%E5%9E%8B%E5%88%B6%E4%BD%9C%E6%8C%87%E5%8D%97%20Rev.%201.0.pdf
// 与中文经历逐段对应，保留职责、技术细节和成果；未核实官方英文名称的公司保留中文。
export const workExperienceEn: readonly ResumeEntry[] = [
  {
    name: "China Guardian Auctions Co., Ltd.",
    role: "Frontend Engineer",
    period: "Oct 2021 – Jun 2026",
    paragraphs: [
      "1. Contributed to the development and ongoing enhancement of China Guardian's auction websites and mini programs for mainland China and Hong Kong.",
      "2. Developed a shared component library for multiple internal management systems at China Guardian.",
      "3. Implemented features for internal management systems and integrated hardware, including ID card scanners, with their web interfaces.",
      "4. Researched emerging AI technologies and developed practical implementation plans, including managing GPU cloud server environments and infrastructure, deploying open-source projects in containers, implementing backend APIs for AI projects, scraping and segmenting training data, and training and fine-tuning models.",
      "5. Participated in requirements reviews, led technical knowledge-sharing sessions, mentored new team members, and helped allocate tasks.",
    ],
  },
  {
    name: "Zuoyebang Education Technology (Beijing) Limited",
    role: "Frontend Engineer",
    period: "Jan 2021 – Aug 2021",
    paragraphs: [
      "Rebuilt the business process management (BPM) system using Vue 2 and Element UI. The company chose to develop an in-house system because its existing third-party solution did not meet business requirements. The new system enabled nontechnical staff to build forms by dragging and dropping components and manage form versions.",
    ],
  },
  {
    name: "Beijing Uinnova Technologies Ltd. (UINO)",
    role: "Frontend Engineer",
    period: "Oct 2020 – Dec 2020",
    paragraphs: [
      "Developed frontend pages for an enterprise architecture management system built with Vue and Element UI, including the subsystem inventory and software catalog modules.",
      "Resigned because the actual responsibilities, work location, and other employment arrangements differed substantially from those agreed before joining.",
    ],
  },
  {
    name: "北京贝塔金科有限公司",
    role: "Frontend Engineer",
    period: "Aug 2019 – Aug 2020",
    paragraphs: [
      "Developed core pages for a cryptocurrency exchange, including cryptocurrency trading, derivatives trading, and order management, along with reusable components. Optimized the exchange's performance and developed selected pages for an office automation (OA) management system.",
    ],
  },
  {
    name: "飞艾科技（北京）有限公司",
    role: "Full-Stack Engineer",
    period: "May 2018 – Jun 2019",
    paragraphs: [
      "Developed the frontend for the company's desktop website and WeChat mini program, along with the corresponding backend APIs and database functionality.",
    ],
  },
  {
    name: "北京沃美伟业自控设备维护中心",
    role: "Electrical Engineer",
    period: "Jul 2015 – Jul 2016",
    paragraphs: [
      "Upgraded the automated control systems at Beijing's Yansha Friendship Shopping Center, Kempinski Hotel, and apartment buildings. Designed and modified the associated control programs and interfaces, and participated in hardware installation, inspection, and maintenance.",
    ],
  },
];

export const projectExperienceEn: readonly ResumeEntry[] = [
  {
    name: "China Guardian Internal Component Library",
    role: "Frontend Engineer",
    period: "Oct 2021 – Jun 2026",
    paragraphs: [
      "Overview:",
      "A shared component library for China Guardian's internal systems in mainland China and Hong Kong, including general administration, finance, contract management, and CRM. Built on Element Plus, the library provided components with on-demand imports and TypeScript definitions, hooks, directives, and utility functions, with support for switching languages.",
      "Responsibilities:",
      "1. Set up the library from scratch, designed its public exports and import options, and established its build tooling and development workflow. Later upgraded Vite from version 6 to version 8, along with the associated plugins and configuration, and added unit and end-to-end tests with AI assistance.",
      "2. Wrapped selected Element Plus components and customized their styles to meet UI requirements.",
      "3. Gathered ongoing feedback from teammates, UI designers, and product colleagues. Extracted common modules into reusable components and packaged shared functionality, such as infinite scrolling and route transition events, as exported hooks and functions.",
      "4. Supported multiple import and registration options, including importing the full library, on-demand named imports, and registering individual components globally. Provided resolver functions for automatically importing components, scripts, and directives in Vite projects.",
      "5. Implemented a custom internationalization solution with built-in Simplified and Traditional Chinese. Supported runtime language switching, extending or overriding dictionaries during plugin installation, variable interpolation, and fallback text for missing translations.",
      "6. Exported TypeScript types for components and updated the Markdown component documentation in the documentation center before each release.",
      "Achievements:",
      "1. Substantially simplified development across internal applications. In addition to base components, provided ready-to-use components for complex business interfaces, including common list page layouts and editable tables. Exposed a wide range of slots, internal state, and methods to preserve flexibility and improve the developer experience.",
      "2. Made the library easy to adopt across different projects with minimal integration effort by offering flexible import options.",
    ],
  },
  {
    name: "China Guardian Auction Websites — Mainland China and Hong Kong",
    role: "Frontend Engineer",
    period: "Oct 2021 – Jun 2026",
    paragraphs: [
      "Overview:",
      "China Guardian's official auction platforms for mainland China and Hong Kong, spanning websites and WeChat mini programs. Features included auction lot browsing, real-time online bidding, live streaming, art news, and user account management.",
      "Responsibilities:",
      "1. Built and iterated on core pages for live auction bidding, online auction bidding, lot details, and search. Supported real-time bids, bid history, lot status, switching between lots, zoomable lot image carousels, and live video from the auction venue.",
      "2. Implemented a reusable masonry layout component and an infinite scrolling hook.",
      "3. Contributed to the migration from Vue 2 and JavaScript to Vue 3 and TypeScript, including upgrades to the build tools and related development plugins.",
      "4. Improved SEO by updating metadata for key pages, optimizing the Hong Kong website's multilingual content, configuring and testing the sites in Google Search Console, and handling migration of obsolete pages.",
      "Achievements:",
      "1. Maintained high availability across bidding pages during multiple major auctions, with very few production bugs.",
      "2. Secured indexing for additional China Guardian pages, including the company overview and careers pages. Both the mainland China and Hong Kong websites ranked first in Google searches in Chinese and English, and organic search traffic increased by more than 30%.",
    ],
  },
  {
    name: "Zuoyebang BPM System",
    role: "Frontend Engineer",
    period: "Jan 2021 – Aug 2021",
    paragraphs: [
      "Project overview: An internal business process management (BPM) system built with Vue 2. Reusable components based on Element UI powered an editor that enabled product managers to build forms for business teams through drag-and-drop interactions. Frontend developers could extend complex forms with custom JavaScript.",
      "Responsibilities:",
      "1. Implemented selected editing pages for the entity model module and developed supporting components.",
      "2. Developed and maintained a Node.js command-line tool to standardize the frontend team's development setup. The tool automatically configured ESLint, Prettier, lint-staged, and Husky, and was published as an npm package to a private registry.",
      "3. Built an abstract syntax tree (AST) transformation layer and a Vue single-file component (SFC) generator that converted the drag-and-drop editor's form JSON and form JavaScript into .vue files.",
    ],
  },
  {
    name: "BetaX Cryptocurrency Exchange",
    role: "Frontend Engineer",
    period: "Aug 2019 – Aug 2020",
    paragraphs: [
      "Project overview: A desktop-only cryptocurrency exchange supporting cryptocurrency trading, derivatives trading, and withdrawals, with responsive layouts for different screen sizes.",
      "Responsibilities:",
      "1. Integrated TradingView candlestick charts, customized their appearance, and extended their functionality. Optimized historical candlestick data retrieval with IndexedDB caching.",
      "2. Combined WebSocket updates for candlesticks, order books, live prices, and trade history with snapshots fetched over HTTP to display current market data. Updated the relevant page sections when users switched cryptocurrencies.",
      "3. Upgraded webpack from version 3 to version 4, along with the associated plugins and configuration.",
      "4. Led improvements to page load performance. Reduced the initial bundle size by adjusting the webpack bundling strategy, generated WebP versions of large images at build time, configured Nginx for image compression, and introduced asynchronous components and lazy loading. Reduced First Contentful Paint (FCP) from 12 seconds to 3 seconds.",
    ],
  },
  {
    name: "飞艾科技 — Desktop Website and WeChat Mini Program",
    role: "Full-Stack Engineer",
    period: "May 2018 – Jun 2019",
    paragraphs: [
      "Project overview: An e-commerce platform centered on a WeChat mini program, with an official website and an administrative interface. Supported consumer shopping and merchant onboarding.",
      "Responsibilities:",
      "1. Designed database tables and developed APIs for the storefront, official website, and administrative interface using MySQL and PHP.",
      "2. Built the official website with Vue 2 and developed the frontend for the WeChat mini program.",
      "3. Maintained the development environments and Nginx configuration on Ubuntu servers.",
    ],
  },
];
