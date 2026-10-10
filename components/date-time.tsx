interface DateTimeProps {
  date?: string | Date;
  format?: "datetime" | "date" | "time";
}

export function DateTime({ date, format = "datetime" }: DateTimeProps) {
  if (!date) {
    return <span>-</span>;
  }

  const d = typeof date === "string" ? new Date(date) : date;

  let options: Intl.DateTimeFormatOptions = {};

  switch (format) {
    case "datetime":
      options = {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      };
      break;
    case "date":
      options = {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      };
      break;
    case "time":
      options = {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      };
      break;
  }

  try {
    return (
      <time dateTime={d.toISOString()} suppressHydrationWarning>
        {d.toLocaleString("zh-CN", options)}
      </time>
    );
  } catch (_error) {
    return <span>Invalid Date</span>;
  }
}
