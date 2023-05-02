import React, { useState } from "react";
import useSWR, { mutate } from "swr";
import Link from "next/link";
import { useRouter } from "next/router";

// helper
import { renderDateFormat } from "helpers/date-time.helper";
import {
  startOfWeek,
  lastDayOfWeek,
  eachDayOfInterval,
  weekDayInterval,
  formatDate,
  getCurrentWeekStartDate,
  getCurrentWeekEndDate,
  subtractMonths,
  addMonths,
  updateDateWithYear,
  updateDateWithMonth,
  isSameMonth,
  isSameYear,
  subtract7DaysToDate,
  addSevenDaysToDate,
} from "helpers/calendar.helper";
// ui
import { Popover, Transition } from "@headlessui/react";
import { DragDropContext, Draggable, DropResult } from "react-beautiful-dnd";
import StrictModeDroppable from "components/dnd/StrictModeDroppable";
import { CustomMenu, Spinner, ToggleSwitch } from "components/ui";
// icon
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
// hooks
import useIssuesView from "hooks/use-issues-view";
// services
import issuesService from "services/issues.service";
import cyclesService from "services/cycles.service";
// fetch key
import {
  CYCLE_CALENDAR_ISSUES,
  MODULE_CALENDAR_ISSUES,
  PROJECT_CALENDAR_ISSUES,
} from "constants/fetch-keys";
// type
import { IIssue } from "types";
// constant
import { monthOptions, yearOptions } from "constants/calendar";
import modulesService from "services/modules.service";
import { getStateGroupIcon } from "components/icons";

type Props = {
  addIssueToDate: (date: string) => void;
};

interface ICalendarRange {
  startDate: Date;
  endDate: Date;
}

export const CalendarView: React.FC<Props> = ({ addIssueToDate }) => {
  const [showWeekEnds, setShowWeekEnds] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isMonthlyView, setIsMonthlyView] = useState(true);
  const [showAllIssues, setShowAllIssues] = useState(false);

  const router = useRouter();
  const { workspaceSlug, projectId, cycleId, moduleId } = router.query;

  const { params } = useIssuesView();

  const [calendarDateRange, setCalendarDateRange] = useState<ICalendarRange>({
    startDate: startOfWeek(currentDate),
    endDate: lastDayOfWeek(currentDate),
  });

  const targetDateFilter = {
    target_date: `${renderDateFormat(calendarDateRange.startDate)};after,${renderDateFormat(
      calendarDateRange.endDate
    )};before`,
  };

  const { data: projectCalendarIssues } = useSWR(
    workspaceSlug && projectId ? PROJECT_CALENDAR_ISSUES(projectId as string) : null,
    workspaceSlug && projectId
      ? () =>
          issuesService.getIssuesWithParams(workspaceSlug as string, projectId as string, {
            ...params,
            target_date: `${renderDateFormat(calendarDateRange.startDate)};after,${renderDateFormat(
              calendarDateRange.endDate
            )};before`,
            group_by: null,
          })
      : null
  );

  const { data: cycleCalendarIssues } = useSWR(
    workspaceSlug && projectId && cycleId
      ? CYCLE_CALENDAR_ISSUES(projectId as string, cycleId as string)
      : null,
    workspaceSlug && projectId && cycleId
      ? () =>
          cyclesService.getCycleIssuesWithParams(
            workspaceSlug as string,
            projectId as string,
            cycleId as string,
            {
              ...params,
              target_date: `${renderDateFormat(
                calendarDateRange.startDate
              )};after,${renderDateFormat(calendarDateRange.endDate)};before`,
              group_by: null,
            }
          )
      : null
  );

  const { data: moduleCalendarIssues } = useSWR(
    workspaceSlug && projectId && moduleId
      ? MODULE_CALENDAR_ISSUES(projectId as string, moduleId as string)
      : null,
    workspaceSlug && projectId && moduleId
      ? () =>
          modulesService.getModuleIssuesWithParams(
            workspaceSlug as string,
            projectId as string,
            moduleId as string,
            {
              ...params,
              target_date: `${renderDateFormat(
                calendarDateRange.startDate
              )};after,${renderDateFormat(calendarDateRange.endDate)};before`,
              group_by: null,
            }
          )
      : null
  );

  const totalDate = eachDayOfInterval({
    start: calendarDateRange.startDate,
    end: calendarDateRange.endDate,
  });

  const onlyWeekDays = weekDayInterval({
    start: calendarDateRange.startDate,
    end: calendarDateRange.endDate,
  });

  const currentViewDays = showWeekEnds ? totalDate : onlyWeekDays;

  const calendarIssues = cycleId
    ? (cycleCalendarIssues as IIssue[])
    : moduleId
    ? (moduleCalendarIssues as IIssue[])
    : (projectCalendarIssues as IIssue[]);

  const currentViewDaysData = currentViewDays.map((date: Date) => {
    const filterIssue =
      calendarIssues && calendarIssues.length > 0
        ? calendarIssues.filter(
            (issue) =>
              issue.target_date && renderDateFormat(issue.target_date) === renderDateFormat(date)
          )
        : [];
    return {
      date: renderDateFormat(date),
      issues: filterIssue,
    };
  });

  const weeks = ((date: Date[]) => {
    const weeks = [];
    if (showWeekEnds) {
      for (let day = 0; day <= 6; day++) {
        weeks.push(date[day]);
      }
    } else {
      for (let day = 0; day <= 4; day++) {
        weeks.push(date[day]);
      }
    }

    return weeks;
  })(currentViewDays);

  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination || !workspaceSlug || !projectId) return;
    if (source.droppableId === destination.droppableId) return;

    const fetchKey = cycleId
      ? CYCLE_CALENDAR_ISSUES(projectId as string, cycleId as string)
      : moduleId
      ? MODULE_CALENDAR_ISSUES(projectId as string, moduleId as string)
      : PROJECT_CALENDAR_ISSUES(projectId as string);

    mutate<IIssue[]>(
      fetchKey,
      (prevData) =>
        (prevData ?? []).map((p) => {
          if (p.id === draggableId)
            return {
              ...p,
              target_date: destination.droppableId,
            };
          return p;
        }),
      false
    );

    issuesService.patchIssue(workspaceSlug as string, projectId as string, draggableId, {
      target_date: destination?.droppableId,
    });
  };

  const updateDate = (date: Date) => {
    setCurrentDate(date);

    setCalendarDateRange({
      startDate: startOfWeek(date),
      endDate: lastDayOfWeek(date),
    });
  };

  return calendarIssues ? (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="-m-2 h-full overflow-y-auto rounded-lg text-brand-secondary">
        <div className="mb-4 flex items-center justify-between">
          <div className="relative flex h-full w-full items-center justify-start gap-2 text-sm ">
            <Popover className="flex h-full items-center justify-start rounded-lg">
              {({ open }) => (
                <>
                  <Popover.Button className={`group flex h-full items-start gap-1 text-brand-base`}>
                    <div className="flex  items-center   justify-center gap-2 text-2xl font-semibold">
                      <span>{formatDate(currentDate, "Month")}</span>{" "}
                      <span>{formatDate(currentDate, "yyyy")}</span>
                    </div>
                  </Popover.Button>

                  <Transition
                    as={React.Fragment}
                    enter="transition ease-out duration-200"
                    enterFrom="opacity-0 translate-y-1"
                    enterTo="opacity-100 translate-y-0"
                    leave="transition ease-in duration-150"
                    leaveFrom="opacity-100 translate-y-0"
                    leaveTo="opacity-0 translate-y-1"
                  >
                    <Popover.Panel className="absolute top-10 left-0 z-20 flex w-full max-w-xs transform flex-col overflow-hidden rounded-[10px] bg-brand-surface-2 shadow-lg">
                      <div className="flex items-center justify-center gap-5 px-2 py-2 text-sm">
                        {yearOptions.map((year) => (
                          <button
                            onClick={() => updateDate(updateDateWithYear(year.label, currentDate))}
                            className={` ${
                              isSameYear(year.value, currentDate)
                                ? "text-sm font-medium text-brand-base"
                                : "text-xs text-brand-secondary "
                            } hover:text-sm hover:font-medium hover:text-brand-base`}
                          >
                            {year.label}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-4  border-t border-brand-base px-2">
                        {monthOptions.map((month) => (
                          <button
                            onClick={() =>
                              updateDate(updateDateWithMonth(month.value, currentDate))
                            }
                            className={`px-2 py-2 text-xs text-brand-secondary hover:font-medium hover:text-brand-base ${
                              isSameMonth(month.value, currentDate)
                                ? "font-medium text-brand-base"
                                : ""
                            }`}
                          >
                            {month.label}
                          </button>
                        ))}
                      </div>
                    </Popover.Panel>
                  </Transition>
                </>
              )}
            </Popover>

            <div className="flex items-center gap-2">
              <button
                className="cursor-pointer"
                onClick={() => {
                  if (isMonthlyView) {
                    updateDate(subtractMonths(currentDate, 1));
                  } else {
                    setCurrentDate(subtract7DaysToDate(currentDate));
                    setCalendarDateRange({
                      startDate: getCurrentWeekStartDate(subtract7DaysToDate(currentDate)),
                      endDate: getCurrentWeekEndDate(subtract7DaysToDate(currentDate)),
                    });
                  }
                }}
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              <button
                className="cursor-pointer"
                onClick={() => {
                  if (isMonthlyView) {
                    updateDate(addMonths(currentDate, 1));
                  } else {
                    setCurrentDate(addSevenDaysToDate(currentDate));
                    setCalendarDateRange({
                      startDate: getCurrentWeekStartDate(addSevenDaysToDate(currentDate)),
                      endDate: getCurrentWeekEndDate(addSevenDaysToDate(currentDate)),
                    });
                  }
                }}
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex w-full items-center justify-end gap-2">
            <button
              className="group flex cursor-pointer items-center gap-2 rounded-md border border-brand-base px-3 py-1 text-sm hover:bg-brand-surface-2 hover:text-brand-base focus:outline-none"
              onClick={() => {
                if (isMonthlyView) {
                  updateDate(new Date());
                } else {
                  setCurrentDate(new Date());
                  setCalendarDateRange({
                    startDate: getCurrentWeekStartDate(new Date()),
                    endDate: getCurrentWeekEndDate(new Date()),
                  });
                }
              }}
            >
              Today
            </button>

            <CustomMenu
              customButton={
                <div className="group flex cursor-pointer items-center gap-2 rounded-md border border-brand-base px-3 py-1 text-sm hover:bg-brand-surface-2 hover:text-brand-base focus:outline-none ">
                  {isMonthlyView ? "Monthly" : "Weekly"}
                  <ChevronDownIcon className="h-3 w-3" aria-hidden="true" />
                </div>
              }
            >
              <CustomMenu.MenuItem
                onClick={() => {
                  setIsMonthlyView(true);
                  setCalendarDateRange({
                    startDate: startOfWeek(currentDate),
                    endDate: lastDayOfWeek(currentDate),
                  });
                }}
                className="w-52 text-sm text-brand-secondary"
              >
                <div className="flex w-full max-w-[260px] items-center justify-between gap-2">
                  <span className="flex items-center gap-2">Monthly View</span>
                  <CheckIcon
                    className={`h-4 w-4 flex-shrink-0 ${
                      isMonthlyView ? "opacity-100" : "opacity-0"
                    }`}
                  />
                </div>
              </CustomMenu.MenuItem>
              <CustomMenu.MenuItem
                onClick={() => {
                  setIsMonthlyView(false);
                  setCalendarDateRange({
                    startDate: getCurrentWeekStartDate(currentDate),
                    endDate: getCurrentWeekEndDate(currentDate),
                  });
                }}
                className="w-52 text-sm text-brand-secondary"
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="flex items-center gap-2">Weekly View</span>
                  <CheckIcon
                    className={`h-4 w-4 flex-shrink-0 ${
                      isMonthlyView ? "opacity-0" : "opacity-100"
                    }`}
                  />
                </div>
              </CustomMenu.MenuItem>
              <div className="mt-1 flex w-52 items-center justify-between border-t border-brand-base py-2 px-1  text-sm text-brand-secondary">
                <h4>Show weekends</h4>
                <ToggleSwitch
                  value={showWeekEnds}
                  onChange={() => setShowWeekEnds(!showWeekEnds)}
                />
              </div>
            </CustomMenu>
          </div>
        </div>

        <div
          className={`grid auto-rows-[minmax(36px,1fr)] rounded-lg ${
            showWeekEnds ? "grid-cols-7" : "grid-cols-5"
          }`}
        >
          {weeks.map((date, index) => (
            <div
              key={index}
              className={`flex  items-center justify-start gap-2 border-brand-base bg-brand-surface-1 p-1.5 text-base font-medium text-brand-secondary ${
                !isMonthlyView
                  ? showWeekEnds
                    ? (index + 1) % 7 === 0
                      ? ""
                      : "border-r"
                    : (index + 1) % 5 === 0
                    ? ""
                    : "border-r"
                  : ""
              }`}
            >
              <span>
                {isMonthlyView ? formatDate(date, "eee").substring(0, 3) : formatDate(date, "eee")}
              </span>
              {!isMonthlyView && <span>{formatDate(date, "d")}</span>}
            </div>
          ))}
        </div>

        <div
          className={`grid h-full auto-rows-[minmax(150px,1fr)] ${
            showWeekEnds ? "grid-cols-7" : "grid-cols-5"
          } `}
        >
          {currentViewDaysData.map((date, index) => {
            const totalIssues = date.issues.length;

            return (
              <StrictModeDroppable droppableId={date.date}>
                {(provided) => (
                  <div
                    key={index}
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`group relative flex flex-col gap-1.5 border-t border-brand-base p-2.5 text-left text-sm font-medium hover:bg-brand-surface-1 ${
                      showWeekEnds
                        ? (index + 1) % 7 === 0
                          ? ""
                          : "border-r"
                        : (index + 1) % 5 === 0
                        ? ""
                        : "border-r"
                    }`}
                  >
                    {isMonthlyView && <span>{formatDate(new Date(date.date), "d")}</span>}
                    {totalIssues > 0 &&
                      date.issues
                        .slice(0, showAllIssues ? totalIssues : 4)
                        .map((issue: IIssue, index) => (
                          <Draggable draggableId={issue.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                key={index}
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`w-full cursor-pointer truncate rounded border border-brand-base px-1.5 py-1 text-xs duration-300 hover:cursor-move hover:bg-brand-surface-2 ${
                                  snapshot.isDragging ? "bg-brand-surface-2 shadow-lg" : ""
                                }`}
                              >
                                <Link
                                  href={`/${workspaceSlug}/projects/${issue?.project_detail.id}/issues/${issue.id}`}
                                >
                                  <a className="flex w-full items-center gap-2">
                                    {getStateGroupIcon(
                                      issue.state_detail.group,
                                      "12",
                                      "12",
                                      issue.state_detail.color
                                    )}
                                    {issue.name}
                                  </a>
                                </Link>
                              </div>
                            )}
                          </Draggable>
                        ))}
                    {totalIssues > 4 && (
                      <button
                        type="button"
                        className="w-min whitespace-nowrap rounded-md border border-brand-base bg-brand-surface-2 px-1.5 py-1 text-xs"
                        onClick={() => setShowAllIssues((prevData) => !prevData)}
                      >
                        {showAllIssues ? "Hide" : totalIssues - 4 + " more"}
                      </button>
                    )}
                    <div
                      className={`absolute ${
                        isMonthlyView ? "bottom-2" : "top-2"
                      } right-2 flex items-center justify-center rounded-md bg-brand-surface-2 p-1 text-xs text-brand-secondary opacity-0 group-hover:opacity-100`}
                    >
                      <button
                        className="flex items-center justify-center gap-1 text-center"
                        onClick={() => addIssueToDate(date.date)}
                      >
                        <PlusIcon className="h-3 w-3 text-brand-secondary" />
                        Add issue
                      </button>
                    </div>
                    {provided.placeholder}
                  </div>
                )}
              </StrictModeDroppable>
            );
          })}
        </div>
      </div>
    </DragDropContext>
  ) : (
    <div className="flex h-full w-full items-center justify-center">
      <Spinner />
    </div>
  );
};