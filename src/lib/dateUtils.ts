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

export const isPastEvent = (dateStr?: string) => {
  if (!dateStr) return false;
  // Extract YYYY.MM.DD
  const cleanDateStr = dateStr.replace(/\(.*?\)/g, '').replace(/（.*?）/g, '').trim();
  const dateParts = cleanDateStr.split('.');
  if (dateParts.length < 2) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let eventDate: Date;
  try {
    if (dateParts.length === 3) {
      eventDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
    } else {
      // Assume current year if missing
      eventDate = new Date(today.getFullYear(), parseInt(dateParts[0]) - 1, parseInt(dateParts[1]));
    }
    
    if (isNaN(eventDate.getTime())) return false;
    
    return eventDate < today;
  } catch (e) {
    return false;
  }
};
