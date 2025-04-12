import React from "react";
import {Chat} from "@/components/chat";

export default function HomeLayout({
    children,
    }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <>
            {children}
        </>
    )
}