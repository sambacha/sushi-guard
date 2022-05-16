import { fetchJsonRpc } from './JSONRPC'
import { useCallback, useEffect, useMemo } from 'react'
import { useRecoilValue } from 'recoil'

import {
  checkedTransaction,
  finalizeTransaction,
  SerializableTransactionReceipt,
  updatePrivateTxStatus,
} from './actions'
import { TransactionDetails } from './reducer'
import { sendRevertTransactionLog } from './sentryLogger'

export function shouldCheck(lastBlockNumber: number, tx: TransactionDetails): boolean {
  if (tx.privateTx) {
    if (
      (tx.privateTx?.state === PrivateTxState.OK && tx.receipt) ||
      tx.privateTx?.state === PrivateTxState.INDETERMINATE ||
      tx.privateTx?.state === PrivateTxState.ERROR
    )
      return false

    if (!tx.lastCheckedBlockNumber) return true

    const blocksSinceCheck = lastBlockNumber - tx.lastCheckedBlockNumber
    if (blocksSinceCheck < 1) return false

    if (tx.privateTx?.state === PrivateTxState.UNCHECKED || tx.privateTx?.state === PrivateTxState.PROCESSING) {
      const minutesPending = txMinutesPending(tx)
      if (minutesPending > 10) {
        // every 2 blocks if pending for longer than 10 minutes
        return blocksSinceCheck > 2
      } else if (minutesPending > 15) {
        // every 3 blocks if pending more than 15 minutes
        return blocksSinceCheck > 3
      } else {
        // otherwise every block
        return true
      }
    }

    // otherwise continue like a regular TX (we shouldn't reach this state though)
  }