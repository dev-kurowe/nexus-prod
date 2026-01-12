"use client"

import * as React from "react"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { CalendarIcon, Clock } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface DateTimePickerInputProps {
  value?: string // Format: "YYYY-MM-DDTHH:mm" atau "YYYY-MM-DD HH:mm"
  onChange: (datetime: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function DateTimePickerInput({
  value,
  onChange,
  placeholder = "Pilih tanggal & waktu",
  disabled = false,
  className,
}: DateTimePickerInputProps) {
  const [open, setOpen] = React.useState(false)
  
  // Parse value to date and time
  const { dateValue, timeValue } = React.useMemo(() => {
    if (!value) return { dateValue: undefined, timeValue: "23:59" }
    
    // Handle both "YYYY-MM-DDTHH:mm" and "YYYY-MM-DD HH:mm" formats
    const normalized = value.replace("T", " ")
    const parts = normalized.split(" ")
    const datePart = parts[0]
    const timePart = parts[1] || "23:59"
    
    const parsed = new Date(datePart + "T" + timePart)
    return {
      dateValue: isNaN(parsed.getTime()) ? undefined : parsed,
      timeValue: timePart.substring(0, 5) // HH:mm
    }
  }, [value])

  // State for time input
  const [time, setTime] = React.useState(timeValue)

  // Update time when value changes
  React.useEffect(() => {
    setTime(timeValue)
  }, [timeValue])

  // Default month to show
  const defaultMonth = React.useMemo(() => {
    return dateValue || new Date()
  }, [dateValue])

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      // Format to YYYY-MM-DD HH:mm
      const dateFormatted = format(date, "yyyy-MM-dd")
      onChange(`${dateFormatted} ${time}`)
    }
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value
    setTime(newTime)
    
    if (dateValue) {
      const dateFormatted = format(dateValue, "yyyy-MM-dd")
      onChange(`${dateFormatted} ${newTime}`)
    }
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
            <>
              {format(dateValue, "d MMMM yyyy", { locale: id })}
              <Clock className="ml-2 h-4 w-4" />
              <span className="ml-1">{time}</span>
            </>
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={dateValue}
          onSelect={handleDateSelect}
          defaultMonth={defaultMonth}
          initialFocus
          captionLayout="dropdown"
          fromYear={2020}
          toYear={2030}
        />
        <div className="border-t p-3">
          <Label htmlFor="time" className="text-sm font-medium flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4" />
            Waktu
          </Label>
          <Input
            id="time"
            type="time"
            value={time}
            onChange={handleTimeChange}
            className="w-full"
          />
        </div>
        <div className="border-t p-3 flex justify-end">
          <Button size="sm" onClick={() => setOpen(false)}>
            Selesai
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
