import Image from "next/image";

import { CreditCard, Dot, Wifi } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const transactions = [
  {
    icon: "/avatars/jd.svg",
    name: "John Doe",
    status: "Paid",
    amount: "-$250.00",
    date: "12 Feb 2025",
  },
  {
    icon: "/avatars/a1.jpg",
    name: "Sophia Roy",
    status: "Received",
    amount: "+$2250.00",
    date: "10 Jan 2025",
  },
  {
    icon: "/avatars/a2.jpg",
    name: "Ethan Carter",
    status: "Paid",
    amount: "-$1050.00",
    date: "14 Apr 2025",
  },
  {
    icon: "/avatars/arhamkhnz.png",
    name: "Rohan Khanna",
    status: "Received",
    amount: "+$250.00",
    date: "20 Jan 2025",
  },
];

const CardDetails: React.FC = () => {
  return (
    <Card className="flex w-full flex-1 flex-col">
      <Tabs defaultValue="virtual" className="w-full">
        <CardHeader className="flex flex-col gap-2">
          <div className="flex w-full items-center justify-between">
            <CardTitle className="text-foreground flex items-center gap-1 text-base">
              {" "}
              <div className="flex h-8 w-10 items-center justify-center rounded-md bg-[#FFF0E7]">
                <CreditCard className="h-7 w-7 bg-[#FFF0E7] text-[#FF690B]" />
              </div>{" "}
              My Cards
            </CardTitle>
            <Button className="text-foreground border border-[#FF690B] bg-white py-0 hover:bg-white">+ Add Card</Button>
          </div>

          <TabsList className="grid w-full grid-cols-2 rounded-md bg-[#FFF0E7]">
            <TabsTrigger
              className="text-foreground data-[state=active]:bg-muted rounded-md bg-[#FFF0E7] px-4 transition data-[state=active]:text-[#FF690B]"
              value="virtual"
            >
              Virtual
            </TabsTrigger>
            <TabsTrigger
              className="text-foreground data-[state=active]:bg-muted rounded-md bg-[#FFF0E7] px-4 transition data-[state=active]:text-[#FF690B]"
              value="physical"
            >
              Physical
            </TabsTrigger>
          </TabsList>
        </CardHeader>

        <CardDescription></CardDescription>
        <CardContent>
          {" "}
          <TabsContent value="virtual" className="w-full">
            <div className="flex flex-col gap-4">
              <Card className="from-muted w-full overflow-hidden rounded-xl bg-gradient-to-r to-[#FFDCC6] text-white shadow-sm">
                <CardContent>
                  <div className="mb-3 flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full border-2 bg-green-700 shadow" />
                    <span className="text-sm text-[#2f855a]">Active</span>{" "}
                  </div>
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center justify-center gap-4">
                      <div>
                        <Image src="/cards/chip.jpg" height={40} width={40} alt="chip" />
                      </div>
                      <Wifi className="text-foreground h-6 w-6 rotate-90" />
                    </div>
                    <div>
                      <Image src="/cards/visa.png" alt="Visa Logo" height={28} width={70} className="h-8 w-auto" />
                    </div>
                  </div>

                  {/* Card Number */}
                  <div className="text-foreground mb-3 font-mono text-xl tracking-widest">1234 5678 9012 3456</div>

                  {/* Card Info */}
                  <div className="flex justify-between text-sm font-light">
                    <div>
                      <div className="text-foreground text-xs font-semibold uppercase opacity-70">Card Holder</div>
                      <div className="text-muted-foreground text-sm font-medium">John Doe</div>
                    </div>
                    <div>
                      <div className="text-foreground text-xs font-semibold uppercase opacity-70">Expires</div>
                      <div className="text-muted-foreground text-sm font-medium">12/26</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="w-full space-y-2 rounded-2xl bg-gradient-to-br from-[#FFF7F2] to-white p-5 shadow-lg">
                {/* Available */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-green-300 p-2 text-[#2f855a]"></div>
                    <span className="text-foreground text-sm font-medium">Available</span>
                  </div>
                  <span className="text-sm font-bold text-[#2f855a]">$8,996.24</span>
                </div>
                <div className="border-t border-[#FFDCC6]" />

                {/* Pending */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-[#FFDCC6] p-2 text-[#FF690B]"></div>
                    <span className="text-foreground text-sm font-medium">Pending</span>
                  </div>
                  <span className="text-sm font-semibold text-[#FF690B]">$208.40</span>
                </div>
                <div className="border-t border-[#FFDCC6]" />
                {/* Daily Limit */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-foreground bg-muted rounded-lg p-2"></div>
                    <span className="text-foreground text-sm font-medium">Daily Limit</span>
                  </div>
                  <span className="text-foreground text-sm font-semibold">$1,500.00</span>
                </div>
              </div>
            </div>
            <div className="mt-3 flex w-full items-center justify-between">
              <span className="text-foreground font-semibold">Last Transaction</span>
              <span className="text-sm text-[#363C98] underline">View all</span>
            </div>
            <div className="w-full">
              <Table className="w-full">
                <TableBody>
                  {transactions.map((tx, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="flex items-start gap-4">
                          <Image src={tx.icon} alt="User" width={32} height={32} className="rounded-full" />

                          {/* Text Content */}
                          <div className="flex flex-col">
                            <span className="text-foreground text-sm font-medium">{tx.name}</span>
                            <div className="mt-1 flex items-center gap-2">
                              <span className="text-muted-foreground text-xs">{tx.status}</span>
                              <Dot className="bg-muted0 inline-block h-1.5 w-1.5 rounded-full" />
                              <span className="text-muted-foreground text-xs">{tx.date}</span>
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        {" "}
                        <span
                          className={
                            tx.amount.startsWith("-") ? "font-medium text-[#9f4e63]" : "font-medium text-[#2f855a]"
                          }
                        >
                          {tx.amount}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          <TabsContent value="physical" className="flex h-64 flex-col items-center justify-center">
            <p>No physical card details available</p>
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
};

export default CardDetails;
