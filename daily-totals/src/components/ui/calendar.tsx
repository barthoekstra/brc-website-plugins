import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  DayButton,
  DayPicker,
  getDefaultClassNames,
} from "react-day-picker";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const d = getDefaultClassNames();
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        root: cn(d.root, "w-fit"),
        months: cn(d.months, "relative flex flex-col gap-4"),
        month: cn(d.month, "flex flex-col gap-3"),
        month_caption: cn(
          d.month_caption,
          "flex h-8 items-center justify-center px-8",
        ),
        caption_label: cn(d.caption_label, "text-sm font-medium"),
        nav: cn(d.nav, "absolute inset-x-0 top-0 flex items-center justify-between"),
        button_previous: cn(
          buttonVariants({ variant: "outline", size: "icon-sm" }),
          "size-7 p-0 opacity-70 hover:opacity-100",
        ),
        button_next: cn(
          buttonVariants({ variant: "outline", size: "icon-sm" }),
          "size-7 p-0 opacity-70 hover:opacity-100",
        ),
        month_grid: cn(d.month_grid, "w-full border-collapse"),
        weekdays: cn(d.weekdays, "flex"),
        weekday: cn(
          d.weekday,
          "w-9 text-[0.7rem] font-normal text-muted-foreground",
        ),
        week: cn(d.week, "mt-1 flex w-full"),
        // Fixed-width cells so empty leading/trailing cells still hold their
        // column — otherwise the month-start offset collapses and weekdays
        // misalign (e.g. the 1st jumps under Sunday).
        day: cn(d.day, "size-9 p-0 text-center text-sm"),
        today: cn(d.today, "font-semibold text-primary"),
        outside: cn(d.outside, "text-muted-foreground/40"),
        disabled: cn(d.disabled, "text-muted-foreground/30"),
        hidden: cn(d.hidden, "invisible"),
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: cls, ...rest }) => {
          const Icon = orientation === "left" ? ChevronLeft : ChevronRight;
          return <Icon className={cn("size-4", cls)} {...rest} />;
        },
        DayButton: AvailabilityDayButton,
      }}
      {...props}
    />
  );
}

/**
 * Day cell that makes "has a count" obvious: available days get a solid green
 * wash, the selected day is filled, days with no count are faint and inert.
 */
function AvailabilityDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const available = !!modifiers.available;
  const selected = !!modifiers.selected;
  return (
    <button
      {...props}
      data-day={day.date.toLocaleDateString()}
      className={cn(
        "relative flex size-9 items-center justify-center rounded-md text-sm transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "bg-primary font-semibold text-primary-foreground hover:bg-primary"
          : available
            ? "cursor-pointer bg-accent font-medium text-accent-foreground hover:bg-primary hover:text-primary-foreground"
            : "cursor-default font-normal text-muted-foreground/30",
        modifiers.today &&
          !selected &&
          "ring-1 ring-inset ring-primary/50",
        className,
      )}
    >
      {props.children}
    </button>
  );
}

export { Calendar };
