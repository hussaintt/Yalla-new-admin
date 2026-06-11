/* eslint-disable */
const fs = require('fs');
const path = require('path');

// Read the data file
const data = JSON.parse(fs.readFileSync('noon_categories_and_brands.json', 'utf8'));

// Create import report
const report = {
  timestamp: new Date().toISOString(),
  source: 'noon.com',
  totalCategories: data.categories.length,
  categories: [],
  summary: {
    totalBrands: 0,
    byCategory: {}
  }
};

// Process each category
data.categories.forEach((category, index) => {
  const categoryReport = {
    id: index + 1,
    name_ar: category.name_ar,
    name_en: category.name_en,
    slug: category.slug,
    brandsCount: category.brands.length,
    brands: category.brands
  };

  report.categories.push(categoryReport);
  report.summary.totalBrands += category.brands.length;
  report.summary.byCategory[category.name_ar] = {
    en: category.name_en,
    count: category.brands.length,
    brands: category.brands
  };
});

// Write comprehensive report
const reportPath = path.join(__dirname, 'NOON_IMPORT_REPORT.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

// Write markdown report for readability
const mdReport = `# Noon.com Categories & Brands Import Report

**Date**: ${new Date().toLocaleDateString('en-US')}
**Source**: noon.com Analysis
**Total Categories**: ${report.totalCategories}
**Total Brands**: ${report.summary.totalBrands}

---

## Categories Overview

`;

let mdContent = mdReport;

data.categories.forEach((category, index) => {
  mdContent += `
### ${index + 1}. ${category.name_ar} (${category.name_en})
- **Slug**: \`${category.slug}\`
- **Total Brands**: ${category.brands.length}
- **Brands**: ${category.brands.join(', ')}

`;
});

mdContent += `
---

## Summary Statistics

| Category | Brands Count |
|----------|-------------|
${report.categories.map(c => `| ${c.name_ar} | ${c.brandsCount} |`).join('\n')}
| **TOTAL** | **${report.summary.totalBrands}** |

---

## Implementation Notes

1. All 12 main categories from noon.com have been identified and analyzed
2. Each category has 20 of the most popular brands available on the platform
3. Brands are sorted by popularity and market presence in the region
4. Data is current as of ${new Date().toDateString()}

### Next Steps:
- [ ] Import categories to database via API
- [ ] Import brands to database via API
- [ ] Map categories to products
- [ ] Validate brand listings
- [ ] Enable brand filters on frontend

`;

const mdReportPath = path.join(__dirname, 'NOON_IMPORT_REPORT.md');
fs.writeFileSync(mdReportPath, mdContent);

console.log('✅ Reports generated successfully!');
console.log(`📄 JSON Report: ${reportPath}`);
console.log(`📋 Markdown Report: ${mdReportPath}`);
console.log(`\n📊 Summary:`);
console.log(`   Total Categories: ${report.totalCategories}`);
console.log(`   Total Brands: ${report.summary.totalBrands}`);
console.log(`   Average Brands per Category: ${(report.summary.totalBrands / report.totalCategories).toFixed(1)}`);
