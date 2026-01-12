"use client"

import * as React from "react"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerInputProps {
  value?: string
  onChange: (date: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function DatePickerInput({
  value,
  onChange,
  placeholder = "Pilih tanggal",
  disabled = false,
  className,
}: DatePickerInputProps) {
  const [open, setOpen] = React.useState(false)
  
  // Parse string date (YYYY-MM-DD) to Date object
  const dateValue = React.useMemo(() => {
    if (!value) return undefined
    const parsed = new Date(value + "T00:00:00")
    return isNaN(parsed.getTime()) ? undefined : parsed
  }, [value])

  // Default month to show - current month or selected date's month
  const defaultMonth = React.useMemo(() => {
    return dateValue || new Date()
  }, [dateValue])

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      // Format to YYYY-MM-DD for form submission
      const formatted = format(date, "yyyy-MM-dd")
      onChange(formatted)
    }
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !dateValue && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {dateValue ? (
            format(dateValue, "d MMMM yyyy", { locale: id })
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={dateValue}
          onSelect={handleSelect}
          defaultMonth={defaultMonth}
          initialFocus
          captionLayout="dropdown"
          fromYear={2020}
          toYear={2030}
        />
      </PopoverContent>
    </Popover>
  )
}
