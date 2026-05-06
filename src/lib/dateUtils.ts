export const formatEventDate = (dateStr?: string) => {
  if (!dateStr) return { year: '', monthDay: '', dayOfWeek: '' };
  
  const s = String(dateStr).trim();
  
  // Extract day of week: (Fri) or （金） or just (Sat) without space before it
  const matchObj = s.match(/\((.*?)\)/) || s.match(/（(.*?)）/);
  const dayOfWeek = matchObj ? matchObj[1] : '';
  
  // Clean string to remove the (Fri) part
  const cleanDate = s.replace(/\(.*?\)/g, '').replace(/（.*?）/g, '').trim();
  
  const parts = cleanDate.split('.');
  
  if (parts.length > 2) {
    return {
      year: parts[0],
      monthDay: parts.slice(-2).join('.'),
      dayOfWeek
    };
  } else if (parts.length === 2) {
    return {
      year: '',
      monthDay: parts.join('.'),
      dayOfWeek
    };
  } else {
    return {
      year: '',
      monthDay: cleanDate,
      dayOfWeek
    };
  }
};
