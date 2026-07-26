"use client";

import dynamic from "next/dynamic";

import { ArrowLeftRight, CircleDollarSign, Clock3, Euro, ReceiptText, RefreshCw, ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

const SemiCircleChart = dynamic(() => import("./pie-chart-flow"), {
  ssr: false,
});

const Summary: React.FC = () => {
  return (
    <>
      <div className="w-full sm:w-1/2">
        <Card className="flex h-full flex-col">
          <CardHeader className="flex justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-10 items-center justify-center rounded-md bg-[#FFF0E7]">
                <Clock3 className="h-6 w-6 text-[#FF690B]" />
              </div>
              <span className="text-foreground text-base font-semibold">Spending Summary</span>
            </div>
            <Select defaultValue="last-week">
              <SelectTrigger className="h-8 border border-[#FF690B] bg-none text-sm shadow-none focus:border-[#FF690B] focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last-week">Last Week</SelectItem>
                <SelectItem value="last-month">Last Month</SelectItem>
                <SelectItem value="last-6months">Last 6 Months</SelectItem>
                <SelectItem value="last-year">Last Year</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <Separator orientation="horizontal" className="w-full" />
          <CardContent className="flex flex-col items-center justify-center px-0">
            <div className="flex h-[150px] w-full items-center justify-center">
              <SemiCircleChart />
            </div>
            <Separator orientation="horizontal" className="mb-2 w-full" />
            <div className="flex">
              <div className="flex items-center justify-center gap-4">
                <div className="flex flex-col items-center gap-1">
                  <div className="flex h-8 w-10 items-center justify-center rounded-md bg-[#e4f0ea]">
                    <ShoppingBag className="h-6 w-6 text-[#2f855a]" />
                  </div>
                  <span className="text-md text-muted-foreground">Shopping</span>
                  <span className="text-muted-foreground text-xs">$900</span>
                </div>
                <Separator orientation="vertical" />
                <div className="flex flex-col items-center gap-1">
                  <div className="flex h-8 w-10 items-center justify-center rounded-md bg-[#FFF0E7]">
                    <ReceiptText className="h-6 w-6 text-[#FF690B]" />
                  </div>
                  <span className="text-md text-muted-foreground">Utilities</span>
                  <span className="text-muted-foreground text-xs">$600</span>
                </div>
                <Separator orientation="vertical" />
                <div className="flex flex-col items-center gap-1">
                  <div className="bg-muted flex h-8 w-10 items-center justify-center rounded-md">
                    <CircleDollarSign className="text-muted-foreground h-6 w-6" />
                  </div>
                  <span className="text-md text-muted-foreground">Others</span>
                  <span className="text-muted-foreground text-xs">$300</span>
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter></CardFooter>
        </Card>
      </div>

      <div className="w-full bg-yellow-200 sm:w-1/2">
        <Card className="flex h-full flex-col">
          <CardHeader className="flex justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-10 items-center justify-center rounded-md bg-[#FFF0E7]">
                <RefreshCw className="h-6 w-6 text-[#FF690B]" />
              </div>
              <span className="text-foreground text-base font-semibold">Exchange</span>
            </div>
            <Button className="text-foreground border border-[#FF690B] bg-white py-0 hover:bg-white">Currencies</Button>
          </CardHeader>

          <CardContent>
            <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
              {/* Header */}
              <div className="flex h-12 items-center justify-center px-2">
                <div className="flex items-center gap-2">
                  <Select defaultValue="USD">
                    <SelectTrigger className="h-8 min-h-0 cursor-not-allowed border-none bg-transparent px-2 text-sm opacity-60 shadow-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                  <Separator orientation="vertical" className="h-6" />
                  <ArrowLeftRight className="h-5 w-5 text-[#FF690B]" />
                  <Separator orientation="vertical" className="h-6" />
                  <Select defaultValue="EUR">
                    <SelectTrigger className="h-8 min-h-0 cursor-not-allowed border-none bg-transparent px-2 text-sm opacity-60 shadow-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Main Content */}
              <Separator orientation="horizontal" className="m-0" />
              <div className="flex h-15 flex-col items-center justify-center py-3">
                <p className="text-xl font-bold text-[#FF690B]">$100.00</p>
                <p className="text-xs">
                  Available: <span className="font-semibold">$16058.94</span>
                </p>
              </div>

              {/* Footer */}
              <Separator orientation="horizontal" className="m-0" />
              <div className="flex h-10 w-full items-center justify-center bg-gradient-to-br from-[#FFF0E7] to-white">
                <p className="m-0 w-full text-center text-sm leading-none">
                  1 USD = <span className="font-semibold">0.94 Eur</span>
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2 text-xs">
            <p className="flex w-full justify-between">
              <span>Tax(2%)</span>
              <span className="font-semibold">$2:00</span>
            </p>
            <p className="flex w-full justify-between">
              <span>Exchange Fee(1%):</span>
              <span className="font-semibold">$1:00</span>
            </p>
            <p className="flex w-full justify-between">
              <span>Total Amount:</span>
              <span className="flex font-semibold">
                <Euro className="h-3 w-3" />
                90.7
              </span>
            </p>
            <Button className="text-foreground w-full border border-[#FF690B] bg-white pt-2 font-semibold hover:bg-white">
              <RefreshCw className="h-5 w-5" />
              <span>Exchange</span>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </>
  );
};

export default Summary;
