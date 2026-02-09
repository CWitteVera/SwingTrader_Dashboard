// Generate sample market data for testing
const fs = require('fs');
const path = require('path');

function generateDailyData(ticker, days = 250) {
  let price = 100;
  const trend = ticker.includes('L') ? 0.002 : -0.002;
  const lines = ['timestamp,open,high,low,close,volume'];
  
  const startDate = new Date('2024-01-01');
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    
    const open = price;
    const change = (Math.random() - 0.45) * 3 + trend * price;
    const close = Math.max(open + change, 0.01);
    const high = Math.max(open, close) * (1 + Math.random() * 0.02);
    const low = Math.min(open, close) * (1 - Math.random() * 0.02);
    const volume = Math.floor(1000000 + Math.random() * 2000000);
    
    lines.push(
      `${date.toISOString().split('T')[0]},${open.toFixed(2)},${high.toFixed(2)},${low.toFixed(2)},${close.toFixed(2)},${volume}`
    );
    
    price = close;
  }
  
  return lines.join('\n');
}

function generateHourlyData(ticker, days = 250) {
  let price = 100;
  const trend = ticker.includes('L') ? 0.0003 : -0.0003;
  const lines = ['timestamp,open,high,low,close,volume'];
  
  const startDate = new Date('2024-01-01 09:00:00');
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    
    for (let hour = 0; hour < 8; hour++) {
      const hourDate = new Date(date);
      hourDate.setHours(9 + hour);
      
      const open = price;
      const change = (Math.random() - 0.48) * 1 + trend * price;
      const close = Math.max(open + change, 0.01);
      const high = Math.max(open, close) * (1 + Math.random() * 0.01);
      const low = Math.min(open, close) * (1 - Math.random() * 0.01);
      const volume = Math.floor(50000 + Math.random() * 100000);
      
      const timestamp = hourDate.toISOString().replace('T', ' ').substring(0, 16);
      lines.push(
        `${timestamp},${open.toFixed(2)},${high.toFixed(2)},${low.toFixed(2)},${close.toFixed(2)},${volume}`
      );
      
      price = close;
    }
  }
  
  return lines.join('\n');
}

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

console.log('Generating sample market data...');

fs.writeFileSync(path.join(dataDir, 'SPXL_D1.csv'), generateDailyData('SPXL', 250));
fs.writeFileSync(path.join(dataDir, 'SPXL_H1.csv'), generateHourlyData('SPXL', 250));
fs.writeFileSync(path.join(dataDir, 'SPXS_D1.csv'), generateDailyData('SPXS', 250));
fs.writeFileSync(path.join(dataDir, 'SPXS_H1.csv'), generateHourlyData('SPXS', 250));

console.log('Sample data generated!');
