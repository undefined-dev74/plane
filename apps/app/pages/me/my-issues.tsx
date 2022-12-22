// react
import React from "react";
// next
import Link from "next/link";
import type { NextPage } from "next";
import Image from "next/image";
// swr
import useSWR from "swr";
// headless ui
import { Disclosure, Listbox, Menu, Popover, Transition } from "@headlessui/react";
// layouts
import AppLayout from "layouts/app-layout";
// hooks
import useUser from "lib/hooks/useUser";
// headless ui
// ui
import { Spinner, Breadcrumbs, BreadcrumbItem, EmptySpace, EmptySpaceItem, HeaderButton } from "ui";
// icons
import {
  CalendarDaysIcon,
  ChevronDownIcon,
  EllipsisHorizontalIcon,
  PlusIcon,
  RectangleStackIcon,
} from "@heroicons/react/24/outline";
import User from "public/user.png";
// services
import userService from "lib/services/user.service";
import issuesServices from "lib/services/issues.service";
import workspaceService from "lib/services/workspace.service";
// hooks
import useIssuesProperties from "lib/hooks/useIssuesProperties";
// hoc
import withAuth from "lib/hoc/withAuthWrapper";
import useMyIssuesProperties from "lib/hooks/useMyIssueFilter";
// components
import ChangeStateDropdown from "components/project/issues/my-issues/ChangeStateDropdown";
// types
import { IIssue, IWorkspaceMember, Properties } from "types";
// constants
import { USER_ISSUE, WORKSPACE_MEMBERS } from "constants/fetch-keys";
import {
  addSpaceIfCamelCase,
  classNames,
  findHowManyDaysLeft,
  renderShortNumericDateFormat,
  replaceUnderscoreIfSnakeCase,
} from "constants/common";
import { PRIORITIES } from "constants/";

const MyIssues: NextPage = () => {
  const { activeWorkspace, user, states } = useUser();

  console.log(states);

  const { data: myIssues, mutate: mutateMyIssues } = useSWR<IIssue[]>(
    user && activeWorkspace ? USER_ISSUE(activeWorkspace.slug) : null,
    user && activeWorkspace ? () => userService.userIssues(activeWorkspace.slug) : null
  );

  const { data: people } = useSWR<IWorkspaceMember[]>(
    activeWorkspace ? WORKSPACE_MEMBERS : null,
    activeWorkspace ? () => workspaceService.workspaceMembers(activeWorkspace.slug) : null
  );

  const [properties, setProperties] = useIssuesProperties(
    activeWorkspace?.slug,
    "21b5fab2-cb0c-4875-9496-619134bf1f32"
  );

  const updateMyIssues = (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    issue: Partial<IIssue>
  ) => {
    mutateMyIssues((prevData) => {
      return prevData?.map((prevIssue) => {
        if (prevIssue.id === issueId) {
          return {
            ...prevIssue,
            ...issue,
            state_detail: {
              ...prevIssue.state_detail,
              ...issue.state_detail,
            },
          };
        }
        return prevIssue;
      });
    }, false);
    issuesServices
      .patchIssue(workspaceSlug, projectId, issueId, issue)
      .then((response) => {
        console.log(response);
      })
      .catch((error) => {
        console.log(error);
      });
  };

  const { filteredIssues, setMyIssueGroupByProperty, setMyIssueProperty, groupByProperty } =
    useMyIssuesProperties(myIssues);

  return (
    <AppLayout
      breadcrumbs={
        <Breadcrumbs>
          <BreadcrumbItem title="My Issues" />
        </Breadcrumbs>
      }
      right={
        <div className="flex items-center gap-2">
          <Popover className="relative">
            {({ open }) => (
              <>
                <Popover.Button
                  className={classNames(
                    open ? "bg-gray-100 text-gray-900" : "text-gray-500",
                    "group flex gap-2 items-center rounded-md bg-transparent text-xs font-medium hover:bg-gray-100 hover:text-gray-900 focus:outline-none border p-2"
                  )}
                >
                  <span>View</span>
                  <ChevronDownIcon className="h-4 w-4" aria-hidden="true" />
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
                  <Popover.Panel className="absolute mr-5 right-1/2 z-10 mt-1 w-screen max-w-xs translate-x-1/2 transform p-3 bg-white rounded-lg shadow-lg overflow-hidden">
                    <div className="relative flex flex-col gap-1 gap-y-4">
                      <div className="relative flex flex-col gap-1">
                        <h4 className="text-base text-gray-600">Properties</h4>
                        <div className="flex items-center gap-2 flex-wrap">
                          {Object.keys(properties).map((key) => (
                            <button
                              key={key}
                              type="button"
                              className={`px-2 py-1 capitalize rounded border border-theme text-xs ${
                                properties[key as keyof Properties]
                                  ? "border-theme bg-theme text-white"
                                  : ""
                              }`}
                              onClick={() => setProperties(key as keyof Properties)}
                            >
                              {replaceUnderscoreIfSnakeCase(key)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Popover.Panel>
                </Transition>
              </>
            )}
          </Popover>
          <HeaderButton
            Icon={PlusIcon}
            label="Add Issue"
            onClick={() => {
              const e = new KeyboardEvent("keydown", {
                key: "i",
                ctrlKey: true,
              });
              document.dispatchEvent(e);
            }}
          />
        </div>
      }
    >
      <div className="w-full h-full flex flex-col space-y-5">
        {myIssues ? (
          <>
            {myIssues.length > 0 ? (
              <div className="flex flex-col space-y-5">
                <Disclosure as="div" defaultOpen>
                  {({ open }) => (
                    <div className="bg-white rounded-lg">
                      <div className="bg-gray-100 px-4 py-3 rounded-t-lg">
                        <Disclosure.Button>
                          <div className="flex items-center gap-x-2">
                            <span>
                              <ChevronDownIcon
                                className={`h-4 w-4 text-gray-500 ${
                                  !open ? "transform -rotate-90" : ""
                                }`}
                              />
                            </span>
                            <h2 className="font-medium leading-5">My Issues</h2>
                            <p className="text-gray-500 text-sm">{myIssues.length}</p>
                          </div>
                        </Disclosure.Button>
                      </div>
                      <Transition
                        show={open}
                        enter="transition duration-100 ease-out"
                        enterFrom="transform opacity-0"
                        enterTo="transform opacity-100"
                        leave="transition duration-75 ease-out"
                        leaveFrom="transform opacity-100"
                        leaveTo="transform opacity-0"
                      >
                        <Disclosure.Panel>
                          <div className="divide-y-2">
                            {myIssues.map((issue: IIssue) => {
                              const assignees = [
                                ...(issue?.assignees_list ?? []),
                                ...(issue?.assignees ?? []),
                              ]?.map((assignee) => {
                                const tempPerson = people?.find(
                                  (p) => p.member.id === assignee
                                )?.member;

                                return {
                                  avatar: tempPerson?.avatar,
                                  first_name: tempPerson?.first_name,
                                  email: tempPerson?.email,
                                };
                              });

                              return (
                                <div
                                  key={issue.id}
                                  className="px-4 py-3 text-sm rounded flex justify-between items-center gap-2"
                                >
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`flex-shrink-0 h-1.5 w-1.5 block rounded-full`}
                                      style={{
                                        backgroundColor: issue.state_detail.color,
                                      }}
                                    />
                                    <Link href={`/projects/${issue.project}/issues/${issue.id}`}>
                                      <a className="group relative flex items-center gap-2">
                                        {/* {properties.key && (
                                          <span className="flex-shrink-0 text-xs text-gray-500">
                                            {issue.project_detail.identifier}-{issue.sequence_id}
                                          </span>
                                        )} */}
                                        <span>{issue.name}</span>
                                        {/* <div className="absolute bottom-full left-0 mb-2 z-10 hidden group-hover:block p-2 bg-white shadow-md rounded-md max-w-sm whitespace-nowrap">
                                          <h5 className="font-medium mb-1">Name</h5>
                                          <div>{issue.name}</div>
                                        </div> */}
                                      </a>
                                    </Link>
                                  </div>
                                  <div className="flex-shrink-0 flex items-center gap-x-1 gap-y-2 text-xs flex-wrap">
                                    {properties.priority && (
                                      <Listbox
                                        as="div"
                                        value={issue.priority}
                                        onChange={(data: string) => {
                                          // partialUpdateIssue({ priority: data }, issue.id);
                                        }}
                                        className="group relative flex-shrink-0"
                                      >
                                        {({ open }) => (
                                          <>
                                            <div>
                                              <Listbox.Button
                                                className={`rounded shadow-sm px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 capitalize ${
                                                  issue.priority === "urgent"
                                                    ? "bg-red-100 text-red-600"
                                                    : issue.priority === "high"
                                                    ? "bg-orange-100 text-orange-500"
                                                    : issue.priority === "medium"
                                                    ? "bg-yellow-100 text-yellow-500"
                                                    : issue.priority === "low"
                                                    ? "bg-green-100 text-green-500"
                                                    : "bg-gray-100"
                                                }`}
                                              >
                                                {issue.priority ?? "None"}
                                              </Listbox.Button>

                                              <Transition
                                                show={open}
                                                as={React.Fragment}
                                                leave="transition ease-in duration-100"
                                                leaveFrom="opacity-100"
                                                leaveTo="opacity-0"
                                              >
                                                <Listbox.Options className="absolute z-10 mt-1 bg-white shadow-lg max-h-28 rounded-md py-1 text-xs ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none">
                                                  {PRIORITIES?.map((priority) => (
                                                    <Listbox.Option
                                                      key={priority}
                                                      className={({ active }) =>
                                                        classNames(
                                                          active ? "bg-indigo-50" : "bg-white",
                                                          "cursor-pointer capitalize select-none px-3 py-2"
                                                        )
                                                      }
                                                      value={priority}
                                                    >
                                                      {priority}
                                                    </Listbox.Option>
                                                  ))}
                                                </Listbox.Options>
                                              </Transition>
                                            </div>
                                            <div className="absolute bottom-full right-0 mb-2 z-10 hidden group-hover:block p-2 bg-white shadow-md rounded-md whitespace-nowrap">
                                              <h5 className="font-medium mb-1 text-gray-900">
                                                Priority
                                              </h5>
                                              <div
                                                className={`capitalize ${
                                                  issue.priority === "urgent"
                                                    ? "text-red-600"
                                                    : issue.priority === "high"
                                                    ? "text-orange-500"
                                                    : issue.priority === "medium"
                                                    ? "text-yellow-500"
                                                    : issue.priority === "low"
                                                    ? "text-green-500"
                                                    : ""
                                                }`}
                                              >
                                                {issue.priority ?? "None"}
                                              </div>
                                            </div>
                                          </>
                                        )}
                                      </Listbox>
                                    )}
                                    {properties.state && (
                                      <Listbox
                                        as="div"
                                        value={issue.state}
                                        onChange={(data: string) => {
                                          // partialUpdateIssue({ state: data }, issue.id);
                                        }}
                                        className="group relative flex-shrink-0"
                                      >
                                        {({ open }) => (
                                          <>
                                            <div>
                                              <Listbox.Button className="flex items-center gap-1 hover:bg-gray-100 border rounded shadow-sm px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-xs duration-300">
                                                <span
                                                  className="flex-shrink-0 h-1.5 w-1.5 rounded-full"
                                                  style={{
                                                    backgroundColor: issue.state_detail.color,
                                                  }}
                                                ></span>
                                                {addSpaceIfCamelCase(issue.state_detail.name)}
                                              </Listbox.Button>

                                              <Transition
                                                show={open}
                                                as={React.Fragment}
                                                leave="transition ease-in duration-100"
                                                leaveFrom="opacity-100"
                                                leaveTo="opacity-0"
                                              >
                                                <Listbox.Options className="absolute z-10 mt-1 bg-white shadow-lg max-h-28 rounded-md py-1 text-xs ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none">
                                                  {states?.map((state) => (
                                                    <Listbox.Option
                                                      key={state.id}
                                                      className={({ active }) =>
                                                        classNames(
                                                          active ? "bg-indigo-50" : "bg-white",
                                                          "cursor-pointer select-none px-3 py-2"
                                                        )
                                                      }
                                                      value={state.id}
                                                    >
                                                      {addSpaceIfCamelCase(state.name)}
                                                    </Listbox.Option>
                                                  ))}
                                                </Listbox.Options>
                                              </Transition>
                                            </div>
                                            <div className="absolute bottom-full right-0 mb-2 z-10 hidden group-hover:block p-2 bg-white shadow-md rounded-md whitespace-nowrap">
                                              <h5 className="font-medium mb-1">State</h5>
                                              <div>{issue.state_detail.name}</div>
                                            </div>
                                          </>
                                        )}
                                      </Listbox>
                                    )}
                                    {properties.start_date && (
                                      <div className="group relative flex-shrink-0 flex items-center gap-1 hover:bg-gray-100 border rounded shadow-sm px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-xs duration-300">
                                        <CalendarDaysIcon className="h-4 w-4" />
                                        {issue.start_date
                                          ? renderShortNumericDateFormat(issue.start_date)
                                          : "N/A"}
                                        <div className="absolute bottom-full right-0 mb-2 z-10 hidden group-hover:block p-2 bg-white shadow-md rounded-md whitespace-nowrap">
                                          <h5 className="font-medium mb-1">Started at</h5>
                                          <div>
                                            {renderShortNumericDateFormat(issue.start_date ?? "")}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                    {properties.due_date && (
                                      <div
                                        className={`group relative flex-shrink-0 group flex items-center gap-1 hover:bg-gray-100 border rounded shadow-sm px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-xs duration-300 ${
                                          issue.target_date === null
                                            ? ""
                                            : issue.target_date < new Date().toISOString()
                                            ? "text-red-600"
                                            : findHowManyDaysLeft(issue.target_date) <= 3 &&
                                              "text-orange-400"
                                        }`}
                                      >
                                        <CalendarDaysIcon className="h-4 w-4" />
                                        {issue.target_date
                                          ? renderShortNumericDateFormat(issue.target_date)
                                          : "N/A"}
                                        <div className="absolute bottom-full right-0 mb-2 z-10 hidden group-hover:block p-2 bg-white shadow-md rounded-md whitespace-nowrap">
                                          <h5 className="font-medium mb-1 text-gray-900">
                                            Due date
                                          </h5>
                                          <div>
                                            {renderShortNumericDateFormat(issue.target_date ?? "")}
                                          </div>
                                          <div>
                                            {issue.target_date &&
                                              (issue.target_date < new Date().toISOString()
                                                ? `Due date has passed by ${findHowManyDaysLeft(
                                                    issue.target_date
                                                  )} days`
                                                : findHowManyDaysLeft(issue.target_date) <= 3
                                                ? `Due date is in ${findHowManyDaysLeft(
                                                    issue.target_date
                                                  )} days`
                                                : "Due date")}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                    {properties.assignee && (
                                      <Listbox
                                        as="div"
                                        value={issue.assignees}
                                        onChange={(data: any) => {
                                          const newData = issue.assignees ?? [];
                                          if (newData.includes(data)) {
                                            newData.splice(newData.indexOf(data), 1);
                                          } else {
                                            newData.push(data);
                                          }
                                          // partialUpdateIssue({ assignees_list: newData }, issue.id);
                                        }}
                                        className="group relative flex-shrink-0"
                                      >
                                        {({ open }) => (
                                          <>
                                            <div>
                                              <Listbox.Button>
                                                <div className="flex items-center gap-1 text-xs cursor-pointer">
                                                  {assignees.length > 0 ? (
                                                    assignees.map((assignee, index: number) => (
                                                      <div
                                                        key={index}
                                                        className={`relative z-[1] h-5 w-5 rounded-full ${
                                                          index !== 0 ? "-ml-2.5" : ""
                                                        }`}
                                                      >
                                                        {assignee.avatar &&
                                                        assignee.avatar !== "" ? (
                                                          <div className="h-5 w-5 border-2 bg-white border-white rounded-full">
                                                            <Image
                                                              src={assignee.avatar}
                                                              height="100%"
                                                              width="100%"
                                                              className="rounded-full"
                                                              alt={assignee?.first_name}
                                                            />
                                                          </div>
                                                        ) : (
                                                          <div
                                                            className={`h-5 w-5 bg-gray-700 text-white border-2 border-white grid place-items-center rounded-full`}
                                                          >
                                                            {assignee.first_name?.charAt(0)}
                                                          </div>
                                                        )}
                                                      </div>
                                                    ))
                                                  ) : (
                                                    <div className="h-5 w-5 border-2 bg-white border-white rounded-full">
                                                      <Image
                                                        src={User}
                                                        height="100%"
                                                        width="100%"
                                                        className="rounded-full"
                                                        alt="No user"
                                                      />
                                                    </div>
                                                  )}
                                                </div>
                                              </Listbox.Button>

                                              <Transition
                                                show={open}
                                                as={React.Fragment}
                                                leave="transition ease-in duration-100"
                                                leaveFrom="opacity-100"
                                                leaveTo="opacity-0"
                                              >
                                                <Listbox.Options className="absolute right-0 z-10 mt-1 bg-white shadow-lg max-h-28 rounded-md py-1 text-xs ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none">
                                                  {people?.map((person) => (
                                                    <Listbox.Option
                                                      key={person.id}
                                                      className={({ active }) =>
                                                        classNames(
                                                          active ? "bg-indigo-50" : "bg-white",
                                                          "cursor-pointer select-none p-2"
                                                        )
                                                      }
                                                      value={person.member.id}
                                                    >
                                                      <div
                                                        className={`flex items-center gap-x-1 ${
                                                          assignees.includes({
                                                            avatar: person.member.avatar,
                                                            first_name: person.member.first_name,
                                                            email: person.member.email,
                                                          })
                                                            ? "font-medium"
                                                            : "font-normal"
                                                        }`}
                                                      >
                                                        {person.member.avatar &&
                                                        person.member.avatar !== "" ? (
                                                          <div className="relative h-4 w-4">
                                                            <Image
                                                              src={person.member.avatar}
                                                              alt="avatar"
                                                              className="rounded-full"
                                                              layout="fill"
                                                              objectFit="cover"
                                                            />
                                                          </div>
                                                        ) : (
                                                          <div className="h-4 w-4 bg-gray-700 text-white grid place-items-center capitalize rounded-full">
                                                            {person.member.first_name &&
                                                            person.member.first_name !== ""
                                                              ? person.member.first_name.charAt(0)
                                                              : person.member.email.charAt(0)}
                                                          </div>
                                                        )}
                                                        <p>
                                                          {person.member.first_name &&
                                                          person.member.first_name !== ""
                                                            ? person.member.first_name
                                                            : person.member.email}
                                                        </p>
                                                      </div>
                                                    </Listbox.Option>
                                                  ))}
                                                </Listbox.Options>
                                              </Transition>
                                            </div>
                                            <div className="absolute bottom-full right-0 mb-2 z-10 hidden group-hover:block p-2 bg-white shadow-md rounded-md whitespace-nowrap">
                                              <h5 className="font-medium mb-1">Assigned to</h5>
                                              <div>
                                                {issue.assignee_details?.length > 0
                                                  ? issue.assignee_details
                                                      .map((assignee) => assignee.first_name)
                                                      .join(", ")
                                                  : "No one"}
                                              </div>
                                            </div>
                                          </>
                                        )}
                                      </Listbox>
                                    )}
                                    <Menu as="div" className="relative">
                                      <Menu.Button
                                        as="button"
                                        className={`h-7 w-7 p-1 grid place-items-center rounded hover:bg-gray-100 duration-300 outline-none`}
                                      >
                                        <EllipsisHorizontalIcon className="h-4 w-4" />
                                      </Menu.Button>
                                      <Menu.Items className="absolute origin-top-right right-0.5 mt-1 p-1 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                                        <Menu.Item>
                                          <button
                                            type="button"
                                            className="text-left p-2 text-gray-900 hover:bg-theme hover:text-white rounded-md text-xs whitespace-nowrap w-full"
                                            onClick={() => {
                                              // setSelectedIssue({
                                              //   ...issue,
                                              //   actionType: "edit",
                                              // });
                                            }}
                                          >
                                            Edit
                                          </button>
                                        </Menu.Item>
                                        <Menu.Item>
                                          <div className="hover:bg-gray-100 border-b last:border-0">
                                            <button
                                              type="button"
                                              className="text-left p-2 text-gray-900 hover:bg-theme hover:text-white rounded-md text-xs whitespace-nowrap w-full"
                                              onClick={() => {
                                                // handleDeleteIssue(issue.id);
                                              }}
                                            >
                                              Delete permanently
                                            </button>
                                          </div>
                                        </Menu.Item>
                                      </Menu.Items>
                                    </Menu>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </Disclosure.Panel>
                      </Transition>
                    </div>
                  )}
                </Disclosure>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col justify-center items-center px-4">
                <EmptySpace
                  title="You don't have any issue assigned to you yet."
                  description="Issues help you track individual pieces of work. With Issues, keep track of what's going on, who is working on it, and what's done."
                  Icon={RectangleStackIcon}
                >
                  <EmptySpaceItem
                    title="Create a new issue"
                    description={
                      <span>
                        Use{" "}
                        <pre className="inline bg-gray-100 px-2 py-1 rounded">Ctrl/Command + I</pre>{" "}
                        shortcut to create a new issue
                      </span>
                    }
                    Icon={PlusIcon}
                    action={() => {
                      const e = new KeyboardEvent("keydown", {
                        key: "i",
                        ctrlKey: true,
                      });
                      document.dispatchEvent(e);
                    }}
                  />
                </EmptySpace>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex justify-center items-center">
            <Spinner />
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default withAuth(MyIssues);