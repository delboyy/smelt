export const STEPS = ["Ingest", "Preview", "Clean", "Review", "Export"] as const;
export type Step = (typeof STEPS)[number];

export const T = {
  bg: "#09090b",
  surface: "#18181b",
  surfaceAlt: "#1c1c20",
  border: "#27272a",
  borderLight: "#3f3f46",
  accent: "#d97706",
  accentDim: "#b45309",
  accentBg: "rgba(217,119,6,0.08)",
  accentBorder: "rgba(217,119,6,0.2)",
  copper: "#c2855a",
  copperDim: "#a06b3f",
  text1: "#fafafa",
  text2: "#a1a1aa",
  text3: "#71717a",
  green: "#22c55e",
  greenBg: "rgba(34,197,94,0.08)",
  greenBorder: "rgba(34,197,94,0.2)",
  red: "#ef4444",
  redBg: "rgba(239,68,68,0.08)",
  redBorder: "rgba(239,68,68,0.2)",
  blue: "#3b82f6",
  blueBg: "rgba(59,130,246,0.08)",
  blueBorder: "rgba(59,130,246,0.2)",
  amber: "#f59e0b",
  amberBg: "rgba(245,158,11,0.08)",
  amberBorder: "rgba(245,158,11,0.2)",
} as const;

export const SAMPLES: Record<string, string> = {
  "Sales Pipeline (Disaster CSV)": `rep_name,email,phone,company,deal_size,stage,close_date,probability,region,currency
SARAH JOHNSON,sarah.johnson@acme.com,+1 (555) 867-5309,Acme Corp,"$120,000",Closed Won,2024-03-15,100%,North America,USD
  mike chen  ,MIKE.CHEN@GLOBEX.IO,(555)4219988,Globex Inc,85000,closed-won,03/28/2024,1.0,APAC,usd
DR. EMILY RODRIGUEZ,emily.rodriguez@initech.com,555.234.5678,  initech corporation  ,"€95,000",Negotiation,April 15 2024,0.75,EMEA,EUR
james o'brien,jamesobrien@,+44 20 7946 0958,TechCorp Ltd,"£72,000",CLOSED WON,15-Apr-24,75%,EMEA,GBP
SARAH JOHNSON,sarah.johnson@acme.com,+1 (555) 867-5309,Acme Corp,"$120,000",Won,2024-03-15,100%,North America,USD
n/a,alex.kim@startup.io,see email,Startup.io Inc,"$2.4M",Discovery,Q2 2024,low,APAC,USD
  ,  ,  ,  ,  ,  ,  ,  ,  ,
rep_name,email,phone,company,deal_size,stage,close_date,probability,region,currency
TOM WILLIAMS,TOM@BIGCO.COM,5551234567,BigCo LLC,"approx $45,000",Proposal,2024/05/01,~60%,North America,USD
priya patel,PRIYA.PATEL@ENTERPRISE.IN,"+91 98765 43210","Enterprise Solutions, Ltd","₹4,500,000",closed won,01.06.2024,yes,APAC,INR
unknown,unknown@unknown.com,000-000-0000,Unknown,0,unknown,TBD,unknown,unknown,unknown
CARLOS MENDEZ,carlos.mendez@latam-corp.mx,(+52) 555-987-6543,LATAM Corp S.A.,"$USD 67,500.00",Negotiation,June 30 2024,65,LATAM,USD
  Mike Chen,mike.chen@globex.io,5554219988,Globex Inc,"$85,000.00",Closed Won,28/03/2024,100%,APAC,USD
jessica lee,jessica@techventures.co,n/a — use slack,Tech Ventures,"$1.2M",Discovery,next quarter,maybe,North America,USD
MR. DAVID PARK,d.park@koreatech.kr,+82-10-9876-5432,Korea Tech Co.,"₩ 98,000,000",PROPOSAL,2024-07-15,55%,APAC,KRW
,carlos.mendez@latam-corp.mx,(+52) 555-987-6543,LATAM Corp,67500,Negotiation,2024-06-30,0.65,LATAM,USD
RACHEL GREEN,rachel.green@friends.tv,1-800-FRIENDS,Central Perk LLC,"$999.99",closed_won,Feb 29 2024,100%,North America,USD`,

  "CRM Contacts (CSV)": `full_name,email,phone,signup_date,company,deal_value,status
john doe,JOHN@ACMECORP.COM,555-1234,2023/01/15,Acme Corp,$50000,active
Jane Smith,jane.smith@widgets.io,(555) 567-8901,01-20-2023,Widgets Inc,"$120,000",Active
bob wilson,BOB@ACMECORP.COM,5559876543,2023.02.01,acme corp,50000,ACTIVE
Alice Brown,,N/A,Feb 5 2023,Acme Corporation,$75000,active
  charlie davis ,charlie@bigco.net,555 111 2222,2023-02-10,BigCo LLC,$30000,actve
john doe,john@acmecorp.com,555-1234,15/01/2023,Acme Corp,$50000,active
María García,maria@widgets.io,+1-555-333-4444,March 12 2023,Widgets Inc,$95000,Active
  Bob Wilson ,bob@acmecorp.com,(555) 987-6543,2023-02-01,ACME CORP,$50000,active`,

  "Product Feed (JSON)": `[
  {"product_name": "wireless bluetooth headphones", "price": "$79.99", "category": "ELECTRONICS", "sku": "WBH-001", "stock": "150", "rating": "4.5", "last_updated": "2024/03/15"},
  {"product_name": "Wireless Bluetooth Headphones", "price": "79.99", "category": "electronics", "sku": "WBH-001", "stock": "150", "rating": "4.5/5", "last_updated": "03-15-2024"},
  {"product_name": "organic green tea - 50 bags", "price": "$12.50", "category": "Food & Beverage", "sku": "OGT-050", "stock": "N/A", "rating": "4.8", "last_updated": "Jan 20, 2024"},
  {"product_name": "ERGONOMIC OFFICE CHAIR", "price": "$349", "category": "furniture", "sku": "EOC-200", "stock": "23", "rating": "4.2 stars", "last_updated": "2024.02.28"},
  {"product_name": "usb-c charging cable 6ft", "price": "14.99 USD", "category": "Electronics/Accessories", "sku": "", "stock": "500+", "rating": "", "last_updated": "2024-01-10"},
  {"product_name": "Organic Green Tea  -  50 Bags", "price": "12.50", "category": "food", "sku": "OGT-050", "stock": "89", "rating": "4.8", "last_updated": "2024/01/20"}
]`,

  "Invoices (XML)": `<?xml version="1.0"?>
<invoices>
  <invoice>
    <id>INV-001</id>
    <client>john doe</client>
    <email>JOHN@EXAMPLE.COM</email>
    <amount>$1,500.00</amount>
    <currency>USD</currency>
    <date>2024/01/15</date>
    <status>paid</status>
    <due_date>2024/02/15</due_date>
  </invoice>
  <invoice>
    <id>INV-002</id>
    <client>Jane Smith</client>
    <email>jane@example.com</email>
    <amount>2500</amount>
    <currency>usd</currency>
    <date>01-20-2024</date>
    <status>PAID</status>
    <due_date>02-20-2024</due_date>
  </invoice>
  <invoice>
    <id>INV-003</id>
    <client>  Bob Wilson </client>
    <email>BOB@EXAMPLE.COM</email>
    <amount>$3,200</amount>
    <currency>USD</currency>
    <date>2024.02.01</date>
    <status>overdue</status>
    <due_date>2024.03.01</due_date>
  </invoice>
  <invoice>
    <id>INV-004</id>
    <client>Alice Brown</client>
    <email></email>
    <amount>1800.50</amount>
    <currency>Usd</currency>
    <date>Feb 5, 2024</date>
    <status>Pending</status>
    <due_date>Mar 5, 2024</due_date>
  </invoice>
  <invoice>
    <id>INV-001</id>
    <client>John Doe</client>
    <email>john@example.com</email>
    <amount>$1,500.00</amount>
    <currency>USD</currency>
    <date>2024-01-15</date>
    <status>paid</status>
    <due_date>2024-02-15</due_date>
  </invoice>
</invoices>`,
};

export const ISSUE_TYPES = ["all", "normalized", "duplicate", "missing", "invalid"] as const;
export type IssueType = (typeof ISSUE_TYPES)[number];

export const EXPORT_FORMATS = ["CSV", "JSON", "XML"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];
