'use client';
import Link from "next/link";
import {Button} from "@/components/ui/button";

export default function Home() {
    return (
        <div className={'flex flex-col items-center justify-center h-screen'}>
            <div
                className={'flex flex-col items-center justify-center border border-black p-4 rounded-lg bg-gray-100 shadow-lg space-y-4'}>
                <h1 className={'font-bold text-4xl'}>Monkey Race</h1>
                <p className={'text-lg'}>A math game about monkeys racing</p>
                <Link href={'/login'}>
                    <Button variant={'link'}
                            className={'text-lg font-bold bounce-effect hover:cursor-pointer hover:underline'}>
                        Start playing!
                    </Button>
                </Link>
            </div>
        </div>
    );
}
