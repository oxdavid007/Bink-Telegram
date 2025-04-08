import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { UserService } from './user.service';

@Injectable()
export class WalletCronService {
  private readonly BATCH_SIZE = 10; // Process 10 users at a time
  private isRunning = false;

  constructor(private readonly userService: UserService) { }

  @Cron('*/5 * * * * *') // Run every 5 seconds
  async createWalletsForUsers() {
    try {
      // Check if another cronjob is running
      if (this.isRunning) {
        console.log('Another wallet creation cronjob is running, skipping...');
        return;
      }

      // Set flag to indicate cronjob is running
      this.isRunning = true;

      // Get users without wallets
      const usersWithoutWallets = await this.userService.findUsersWithoutWallets(this.BATCH_SIZE);

      if (usersWithoutWallets.length === 0) {
        this.isRunning = false;
        return;
      }

      console.log(`Found ${usersWithoutWallets.length} users without wallets`);

      // Process users sequentially
      for (const user of usersWithoutWallets) {
        try {
          await this.userService.createWalletForUser(user);
          console.log(`Successfully created wallet for user ${user.id}`);
        } catch (error) {
          console.error(`Error creating wallet for user ${user.id}:`, error);
          // Continue with next user
          continue;
        }
      }

      console.log('Wallet creation cronjob completed');
      this.isRunning = false;
    } catch (error) {
      console.error('Error in wallet creation cronjob:', error);
      this.isRunning = false;
    }
  }
} 