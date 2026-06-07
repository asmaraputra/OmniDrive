const dateStr = "2026-06-07T09:23:00.000Z";
console.log(dateStr);
const d = new Date(dateStr);
console.log(d.getTime());
console.log(new Date().getTime());
console.log(d < new Date());
