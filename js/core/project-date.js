// Older project indexes may have no date, or an unreadable imported timestamp.
// Present that metadata without rewriting the project or blocking the editor.
export function projectDate(value) {
 if (value == null || value === '' || typeof value === 'boolean') return {label:'—',dateTime:''};
 const date=new Date(value);
 if (!Number.isFinite(date.getTime())) return {label:'—',dateTime:''};
 return {label:date.toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'}),dateTime:date.toISOString()};
}
