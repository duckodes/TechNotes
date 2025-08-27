const dateutils = (() => {
    function ToDate(timestamp = Date.now()) {
        const date = new Date(timestamp);
        return date;
    }
    function ToDateTime(timestamp = Date.now()) {
        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
    function dateTimeToTimestamp(year = 0, month = 0, day = 0, hours = 0, minutes = 0, seconds = 0) {
        const timestamp = new Date(year, month - 1, day, hours, minutes, seconds).getTime();
        return timestamp;
    }
    function _dateTimeToTimestamp(dateTimeString = "1970-1-1_08:00:00") {
        const [datePart, timePart] = dateTimeString.split('_');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes, seconds] = timePart.split(':').map(Number);

        const timestamp = new Date(year, month - 1, day, hours, minutes, seconds).getTime();
        return timestamp;
    }
    function encrypt(timestamp = Date.now()) {
        const now = new Date(timestamp);
        const uniqueCode = `${now.getFullYear()}${now.getMonth()}${now.getDate()}${now.getHours()}${now.getMinutes()}${now.getSeconds()}${now.getMilliseconds()}${Math.random() * 10000}`;
        const hashedCode = btoa(uniqueCode).replace(/=/g, '');
        return hashedCode;
    }
    return {
        ToDate: ToDate,
        ToDateTime: ToDateTime,
        ToTimestamp: dateTimeToTimestamp,
        _ToTimestamp: _dateTimeToTimestamp,
        ToHash: encrypt
    }
})();

export default dateutils;