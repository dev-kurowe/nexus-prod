import * as React from "react";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Event {
  id: number;
  title: string;
  slug: string;
  start_date: string;
  end_date: string;
  status: string;
}

export function DashboardCalendar() {
  const navigate = useNavigate();
  const [eventDates, setEventDates] = React.useState<Map<string, Event[]>>(new Map());
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined);
  
  // Helper function to parse date string and extract local date (ignoring timezone)
  const parseEventDate = (dateStr: string): Date => {
    // If the date string contains 'T', it's ISO format - extract just the date part
    // to avoid timezone conversion issues
    if (dateStr.includes('T')) {
      const datePart = dateStr.split('T')[0]; // "2026-01-14"
      const [year, month, day] = datePart.split('-').map(Number);
      return new Date(year, month - 1, day); // month is 0-indexed
    }
    // Otherwise, parse normally
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Helper function to get date key (YYYY-MM-DD) without timezone issues
  const getDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Fetch events
  React.useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await api.get("/events?include_done=true");
        const eventsData: Event[] = res.data?.data || [];
        
        // Create a map of dates to events
        const dateMap = new Map<string, Event[]>();
        eventsData.forEach((event) => {
          // Include all events (draft, published, done) in calendar
          
          const startDate = parseEventDate(event.start_date);
          const endDate = parseEventDate(event.end_date);
          
          // Add all dates between start and end (inclusive)
          const currentDate = new Date(startDate);
          while (currentDate <= endDate) {
            const dateKey = getDateKey(currentDate);
            if (!dateMap.has(dateKey)) {
              dateMap.set(dateKey, []);
            }
            dateMap.get(dateKey)?.push(event);
            currentDate.setDate(currentDate.getDate() + 1);
          }
        });
        setEventDates(dateMap);
      } catch (error) {
        console.error("Failed to fetch events:", error);
      }
    };
    
    fetchEvents();
  }, []);

  // Get dates with upcoming events for modifiers
  const upcomingEventDates = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dates: Date[] = [];
    
    eventDates.forEach((_, dateKey) => {
      // Parse date key (YYYY-MM-DD) without timezone conversion
      const [year, month, day] = dateKey.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      if (date >= today) {
        dates.push(date);
      }
    });
    
    return dates;
  }, [eventDates]);

  // Get events for a specific date
  const getEventsForDate = (date: Date): Event[] => {
    const dateKey = getDateKey(date);
    return eventDates.get(dateKey) || [];
  };

  // Get events for selected date
  const selectedDateEvents = React.useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = getDateKey(selectedDate);
    return eventDates.get(dateKey) || [];
  }, [selectedDate, eventDates]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Kalender Event</CardTitle>
      </CardHeader>
      <CardContent>
        <TooltipProvider delayDuration={100}>
          <Calendar 
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md border shadow mx-auto"
            modifiers={{
              hasEvent: upcomingEventDates,
            }}
            components={{
              DayButton: ({ day, modifiers, ...props }) => {
                const eventsOnDate = getEventsForDate(day.date);
                const hasEvents = eventsOnDate.length > 0;
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const isUpcoming = day.date >= today;
                
                if (hasEvents && isUpcoming) {
                  return (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="relative">
                          <CalendarDayButton day={day} modifiers={modifiers} {...props} />
                          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full pointer-events-none"></span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[200px] z-[100]">
                        <div className="space-y-1">
                          <p className="font-semibold text-xs">
                            {eventsOnDate.length} Event{eventsOnDate.length > 1 ? "s" : ""}:
                          </p>
                          {eventsOnDate.slice(0, 3).map((event) => (
                            <p key={event.id} className="text-xs truncate">
                              • {event.title}
                            </p>
                          ))}
                          {eventsOnDate.length > 3 && (
                            <p className="text-xs text-muted-foreground">
                              +{eventsOnDate.length - 3} lainnya
                            </p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                }
                
                return <CalendarDayButton day={day} modifiers={modifiers} {...props} />;
              },
            }}
          />
        </TooltipProvider>
        
        {/* Show events for selected date */}
        {selectedDateEvents.length > 0 && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg border">
            <p className="font-semibold text-sm mb-2">
              {selectedDate?.toLocaleDateString("id-ID", { 
                weekday: "long", 
                day: "numeric", 
                month: "long" 
              })}
            </p>
            <p className="text-xs text-muted-foreground mb-2">
              {selectedDateEvents.length} Event{selectedDateEvents.length > 1 ? "s" : ""}:
            </p>
            <div className="space-y-1">
              {selectedDateEvents.slice(0, 5).map((event) => (
                <p 
                  key={event.id} 
                  className="text-sm truncate cursor-pointer hover:text-blue-600"
                  onClick={() => navigate(`/event/${event.slug}`)}
                >
                  • {event.title}
                </p>
              ))}
              {selectedDateEvents.length > 5 && (
                <p className="text-xs text-muted-foreground">
                  +{selectedDateEvents.length - 5} lainnya
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
